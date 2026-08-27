import { useTabBarStore } from '@/stores/tabbar'

export type AppTabIndex = 0 | 1 | 2 | 3 | 4
export const APP_CONTAINER_ROUTE = 'pages/index/index'

/**
 * Tab 全局控制助手。
 *
 * 所有端都使用根页面内的唯一悬浮 TabBar，由全局 store 保存选中和显隐状态。
 */
/**
 * 切换根容器内的 Tab。根页面内只改状态，不重新导航；从二级页面返回时
 * 才重建根页面，避免把二级页面错误地叠加在主容器上。
 */
export const switchAppTab = (index: AppTabIndex) => {
  const store = useTabBarStore()
  store.setSelected(index)
  const pages = getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route || ''
  if (currentRoute === APP_CONTAINER_ROUTE) return
  uni.reLaunch({ url: `/pages/index/index?tab=${index}` })
}

export const hideFloatingTabBar = () => {
  useTabBarStore().hide()
}

export const showFloatingTabBar = () => {
  useTabBarStore().show()
}
