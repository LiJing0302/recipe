import { defineStore } from 'pinia'
import type { BasketPendingItem } from '@/types'
import {
  addRecipeToBasket as addRecipeToBasketRemote,
  loadBasket,
  purchaseBasketItems as purchaseBasketItemsRemote,
  removeRecipeFromBasket as removeRecipeFromBasketRemote,
  removeRecipeFromBasketByRecipeId as removeRecipeFromBasketByRecipeIdRemote
} from '@/services/basket'
import type { RemotePurchaseItem } from '@/services/api'
import { getAuthToken } from '@/services/storage'
import { useInventoryStore } from './inventory'

/**
 * 菜篮子跨页面共享状态。
 * 页面只读写这里，避免菜单页和菜篮子页各自维护一份列表。
 */
export const useBasketStore = defineStore('basket', {
  state: () => ({
    items: [] as BasketPendingItem[],
    loaded: false,
    loading: false,
    revision: 0
  }),
  getters: {
    count: (state) => state.items.length
  },
  actions: {
    clear() {
      this.revision += 1
      this.items = []
      this.loaded = false
      this.loading = false
    },

    async load() {
      const token = getAuthToken()
      if (!token) {
        this.clear()
        this.loaded = true
        return this.items
      }

      const revision = this.revision
      this.loading = true
      try {
        const items = await loadBasket()
        // 会话切换或本地操作发生后，旧请求不能覆盖 Store 中的新状态。
        if (revision !== this.revision || token !== getAuthToken()) return this.items
        this.items = [...items]
        this.loaded = true
        return this.items
      } finally {
        if (revision === this.revision && token === getAuthToken()) this.loading = false
      }
    },

    async refresh() {
      return this.load()
    },

    async addRecipe(recipeId: string, ingredientIds?: string[]) {
      const token = getAuthToken()
      if (!token) return []
      if (!this.loaded) await this.load()
      if (token !== getAuthToken()) return []
      const revision = ++this.revision
      const items = await addRecipeToBasketRemote(recipeId, undefined, ingredientIds, this.items)
      if (revision !== this.revision || token !== getAuthToken()) return []
      // 非幂等写操作成功后，必须以刷新接口返回的数据为 Store 唯一来源。
      await this.refresh()
      return items
    },

    async removeItem(id: string) {
      await this.removeItems([id])
    },

    async removeItems(ids: string[]) {
      const token = getAuthToken()
      if (!token) return
      if (!this.loaded) await this.load()
      if (token !== getAuthToken()) return
      const revision = ++this.revision
      await Promise.all(ids.map((id) => removeRecipeFromBasketRemote(id)))
      if (revision !== this.revision || token !== getAuthToken()) return
      // 不直接删除本地数据；写接口成功后重新 GET，避免服务端实际状态与前端推断不一致。
      await this.refresh()
    },

    async removeRecipe(recipeId: string) {
      const token = getAuthToken()
      if (!token) return
      if (!this.loaded) await this.load()
      if (token !== getAuthToken()) return
      const revision = ++this.revision
      await removeRecipeFromBasketByRecipeIdRemote(recipeId)
      if (revision !== this.revision || token !== getAuthToken()) return
      await this.refresh()
    },

    async purchaseItems(ids: string[], input: Omit<RemotePurchaseItem, 'basketItemId'>) {
      const token = getAuthToken()
      if (!token) throw new Error('请先登录')
      if (!this.loaded) await this.load()
      if (token !== getAuthToken()) throw new Error('登录状态已更新')
      const revision = ++this.revision
      const result = await purchaseBasketItemsRemote(ids, input)
      if (revision !== this.revision || token !== getAuthToken()) return result
      await useInventoryStore().refresh()
      if (revision !== this.revision || token !== getAuthToken()) return result
      await this.refresh()
      return result
    }
  }
})
