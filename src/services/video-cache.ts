/**
 * 视频本地缓存。
 *
 * 背景：后端 /api/uploads/object 不透传 Range、也不下发 Content-Length，播放器没法
 * 边下边播；而冰箱动画的 <video> 又是点击时才挂载，等于点击那一刻才开始发请求，
 * 空 video 元素在无 poster 时渲染成黑盒，一淡入就是"先黑屏再播放"。
 *
 * 对策：页面空闲时把视频提前下载到本地，播放时直接用本地路径，首帧几乎即时。
 * - 小程序 / App：downloadFile → saveFile 落盘，路径写进 storage，下次启动仍命中。
 * - H5：downloadFile 拿到的是 blob: URL（刷新即失效），额外存一份到 IndexedDB，
 *       启动时还原成 ObjectURL，保证跨刷新也能命中。
 */

const STORAGE_KEY = 'recipe-ai-video-cache'
const DB_NAME = 'recipe-ai-media-cache'
const DB_STORE = 'videos'
const DB_VERSION = 1

/**
 * 本地缓存总开关。改成 false 就完全走原来的远程地址（仍有"首帧就绪才淡入"的兜底），
 * 用来二分定位是不是本地文件本身的问题。
 */
const CACHE_ENABLED = true

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi|flv|m3u8)(?=[?#]|$)/i

/** 从 url 里猜容器后缀，猜不到就按 mp4 处理。 */
const cacheFileName = (url: string) => {
  const matched = url.match(VIDEO_EXTENSIONS)
  const ext = matched ? matched[0].toLowerCase() : '.mp4'
  let hash = 0
  for (let i = 0; i < url.length; i += 1) hash = (hash * 31 + url.charCodeAt(i)) | 0
  return `video-${Math.abs(hash).toString(36)}${ext}`
}

/**
 * 本地用户目录。微信小程序是 wx.env.USER_DATA_PATH（wxfile://usr），
 * App 端是 uni.env.USER_DATA_PATH；拿不到就返回空串，交给文件系统自己安排。
 */
const userDataPath = (): string => {
  try {
    const scope = globalThis as unknown as {
      wx?: { env?: { USER_DATA_PATH?: string } }
      uni?: { env?: { USER_DATA_PATH?: string } }
    }
    return scope.wx?.env?.USER_DATA_PATH || scope.uni?.env?.USER_DATA_PATH || ''
  } catch {
    return ''
  }
}

type FileSystemManagerLike = {
  saveFile?: (options: {
    tempFilePath: string
    filePath?: string
    success?: (result: { savedFilePath?: string }) => void
    fail?: (result: unknown) => void
  }) => void
}

/**
 * 把临时文件另存为本地用户文件。
 *
 * 注意 uni.saveFile 不能指定保存路径，小程序生成的是 wxfile://store_xxxx 这种
 * 没有扩展名的文件，video 组件靠后缀判断容器格式，结果就是"首帧出来了但 play() 不生效"。
 * 所以这里走底层文件系统，显式存成带 .mp4 后缀的路径。
 */
const persistTempFile = (url: string, tempFilePath: string): Promise<string> =>
  new Promise((resolve) => {
    const dir = userDataPath()
    const filePath = dir ? `${dir}/${cacheFileName(url)}` : ''
    const resolveWith = (saved?: string) => resolve(saved || tempFilePath)
    try {
      const fs = (
        uni as unknown as { getFileSystemManager?: () => FileSystemManagerLike }
      ).getFileSystemManager?.()
      if (!fs?.saveFile) {
        throw new Error('file system manager unavailable')
      }
      fs.saveFile({
        tempFilePath,
        ...(filePath ? { filePath } : {}),
        success: (result) => resolveWith(result?.savedFilePath),
        fail: () => resolveWith()
      })
    } catch {
      uni.saveFile({
        tempFilePath,
        success: (result) => resolveWith(result?.savedFilePath),
        fail: () => resolveWith()
      })
    }
  })

type CacheMap = Record<string, string>

// 内存态：命中后不再读 storage / IndexedDB，避免每次播放都走异步。
const memory = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

const readMap = (): CacheMap => {
  try {
    return (JSON.parse(uni.getStorageSync(STORAGE_KEY) || '{}') as CacheMap) || {}
  } catch {
    return {}
  }
}

const writeMap = (map: CacheMap) => {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 配额写满时忽略，内存态在当前会话内依然有效。
  }
}

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })

const readBlob = async (url: string): Promise<Blob | null> => {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(url)
      request.onsuccess = () => resolve((request.result as Blob) || null)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const writeBlob = async (url: string, blob: Blob) => {
  const db = await openDb()
  if (!db) return
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(blob, url)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

const downloadToLocal = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          resolve(null)
          return
        }
        // #ifdef H5
        // H5 的 tempFilePath 是 blob: URL，刷新即失效，转存 IndexedDB 才能跨刷新命中。
        fetch(res.tempFilePath)
          .then((response) => response.blob())
          .then(async (blob) => {
            if (!blob.size) {
              resolve(null)
              return
            }
            await writeBlob(url, blob)
            resolve(URL.createObjectURL(blob))
          })
          .catch(() => resolve(res.tempFilePath))
        return
        // #endif
        // #ifndef H5
        // 小程序 / App：把临时文件另存为本地用户文件，跨会话保留。
        void persistTempFile(url, res.tempFilePath).then(resolve)
        // #endif
      },
      fail: () => resolve(null)
    })
  })

const deleteBlob = async (url: string) => {
  const db = await openDb()
  if (!db) return
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).delete(url)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

const restoreFromIndexedDb = async (url: string) => {
  const blob = await readBlob(url)
  if (blob && blob.size) memory.set(url, URL.createObjectURL(blob))
}

/** 开发期排查用：打印缓存文件的真实大小，跟源站大小对不上就说明下载被截断了。 */
const reportCachedFile = (filePath: string) => {
  // #ifdef MP-WEIXIN
  try {
    const fs = (uni as unknown as {
      getFileSystemManager?: () => { getFileInfo?: (o: {
        filePath: string
        success?: (r: { size?: number }) => void
        fail?: (r: unknown) => void
      }) => void }
    }).getFileSystemManager?.()
    fs?.getFileInfo?.({
      filePath,
      success: (res) => console.log('[视频缓存] 落盘大小', res.size, filePath),
      fail: (err) => console.log('[视频缓存] 读取落盘文件失败', err, filePath)
    })
  } catch (err) {
    console.log('[视频缓存] getFileInfo 不可用', err)
  }
  // #endif
}

/**
 * 预热视频缓存。重复调用安全，同一 url 只会下载一次。
 * @returns 本地路径，失败或环境不支持时返回 null（调用方继续用远程地址即可）。
 */
export const primeVideoCache = (url: string): Promise<string | null> => {
  if (!CACHE_ENABLED || !url) return Promise.resolve(null)
  if (memory.has(url)) return Promise.resolve(memory.get(url) as string)
  const pending = inflight.get(url)
  if (pending) return pending

  const task = (async () => {
    // #ifdef H5
    await restoreFromIndexedDb(url)
    if (memory.has(url)) return memory.get(url) as string
    // #endif
    // #ifndef H5
    const saved = readMap()[url]
    if (saved) {
      memory.set(url, saved)
      return saved
    }
    // #endif

    const local = await downloadToLocal(url)
    if (!local) return null
    memory.set(url, local)
    reportCachedFile(local)
    // #ifndef H5
    const next = readMap()
    next[url] = local
    writeMap(next)
    // #endif
    return local
  })().finally(() => {
    inflight.delete(url)
  })

  inflight.set(url, task)
  return task
}

/**
 * 丢弃某条缓存记录。缓存文件被系统清理、或 blob 失效导致播放报错时调用，
 * 下次会重新下载，避免一直卡在一个坏掉的地址上。
 */
export const dropVideoCache = (url: string) => {
  memory.delete(url)
  inflight.delete(url)
  // #ifdef H5
  void deleteBlob(url)
  // #endif
  // #ifndef H5
  const next = readMap()
  delete next[url]
  writeMap(next)
  // #endif
}

/** 取播放源：已缓存就用本地路径，否则回落到远程地址。 */
export const getCachedVideoSrc = (url: string) => memory.get(url) || url
