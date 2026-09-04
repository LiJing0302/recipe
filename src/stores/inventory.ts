import { defineStore } from 'pinia'
import type { Ingredient, IngredientInventoryBatch } from '@/types'
import {
  createInventoryBatch,
  fetchInventoryBatches,
  hasUsableIngredient as hasUsableIngredientInBatches,
  removeInventoryBatchRemote,
  updateInventoryBatchRemote,
  type InventoryBatchInput
} from '@/services/inventory'
import { getAuthSessionVersion } from '@/services/auth-session'
import { formatDate } from '@/services/menu'
import { getAuthToken } from '@/services/storage'

type InventoryBatchUpdateInput = Omit<InventoryBatchInput, 'sourceType' | 'recipeId' | 'recipeTitle' | 'basketItemId'>

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    batches: [] as IngredientInventoryBatch[],
    loaded: false,
    loading: false,
    revision: 0
  }),
  actions: {
    clear() {
      this.revision += 1
      this.batches = []
      this.loaded = false
      this.loading = false
    },

    async load(force = false) {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) {
        this.clear()
        this.loaded = true
        return this.batches
      }
      if (this.loaded && !force) return this.batches

      const revision = ++this.revision
      this.loading = true
      try {
        const batches = await fetchInventoryBatches()
        if (revision !== this.revision || token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return this.batches
        this.batches = [...batches]
        this.loaded = true
        return this.batches
      } finally {
        if (revision === this.revision && token === getAuthToken() && sessionVersion === getAuthSessionVersion()) this.loading = false
      }
    },

    async refresh() {
      return this.load(true)
    },

    async addBatch(input: InventoryBatchInput) {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) throw new Error('请先登录')
      await createInventoryBatch(input)
      if (token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return this.batches
      return this.refresh()
    },

    async updateBatch(id: string, input: InventoryBatchUpdateInput) {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) throw new Error('请先登录')
      await updateInventoryBatchRemote(id, input)
      if (token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return this.batches
      return this.refresh()
    },

    async removeBatch(id: string) {
      const token = getAuthToken()
      const sessionVersion = getAuthSessionVersion()
      if (!token) throw new Error('请先登录')
      await removeInventoryBatchRemote(id)
      if (token !== getAuthToken() || sessionVersion !== getAuthSessionVersion()) return this.batches
      return this.refresh()
    },

    batchesForDate(date = formatDate()) {
      return this.batches.filter((batch) => batch.purchasedAt.slice(0, 10) === date)
    },

    hasUsableIngredient(ingredient: Pick<Ingredient, 'name' | 'ingredientKey'>) {
      return hasUsableIngredientInBatches(this.batches, ingredient)
    }
  }
})
