import type { IngredientInventoryBatch } from '@/types'
import { getFreshness, type FreshnessStatus } from './inventory'

export type InventoryZone = 'fridge' | 'seasoning' | 'vegetable'

export interface IngredientGroup {
  key: string
  name: string
  batches: IngredientInventoryBatch[]
  status: FreshnessStatus
  statusLabel: string
  remainingDays: number
  latestPurchasedAt: string
}

export interface InventoryZoneConfig {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
}

export const INVENTORY_ZONES: Record<InventoryZone, InventoryZoneConfig> = {
  fridge: { title: '冰箱', description: '冷藏和冷冻食材都在这里，按新鲜程度优先使用。', emptyTitle: '冰箱里还没有食材', emptyDescription: '添加一批冷藏或冷冻食材，就能在这里查看。' },
  seasoning: { title: '调料台', description: '集中查看食材库中分类为调味品的食材。', emptyTitle: '调料台还没有食材', emptyDescription: '添加调味品后，它会自动出现在这里。' },
  vegetable: { title: '蔬菜架', description: '这里展示常温保存的蔬菜，买回家后更容易找到。', emptyTitle: '蔬菜架还没有食材', emptyDescription: '添加常温保存的蔬菜后，它会自动出现在这里。' }
}

export const isInventoryZone = (value: string | undefined): value is InventoryZone => value === 'fridge' || value === 'seasoning' || value === 'vegetable'

export const filterInventoryByZone = (batches: IngredientInventoryBatch[], zone: InventoryZone) => batches.filter((batch) => {
  if (zone === 'fridge') return batch.storageMode === 'chilled' || batch.storageMode === 'frozen'
  if (zone === 'seasoning') return batch.category === '调味品'
  return batch.category === '蔬菜' && batch.storageMode === 'room'
})

const freshnessRank: Record<FreshnessStatus, number> = { expiring: 0, expired: 1, normal: 2, fresh: 3 }

export const groupInventoryBatches = (batches: IngredientInventoryBatch[]): IngredientGroup[] => {
  const grouped = new Map<string, { name: string; batches: IngredientInventoryBatch[] }>()
  batches.forEach((batch) => {
    const key = batch.ingredientKey || batch.normalizedName || batch.name.trim().toLowerCase()
    const group = grouped.get(key) || { name: batch.name, batches: [] }
    group.batches.push(batch)
    grouped.set(key, group)
  })
  return [...grouped.entries()].map(([key, group]) => {
    const sortedBatches = [...group.batches].sort((left, right) => right.purchasedAt.localeCompare(left.purchasedAt))
    const statusBatch = sortedBatches.map((batch) => ({ freshness: getFreshness(batch) })).sort((left, right) => freshnessRank[left.freshness.status] - freshnessRank[right.freshness.status] || left.freshness.remainingDays - right.freshness.remainingDays)[0]
    return { key, name: group.name, batches: sortedBatches, status: statusBatch.freshness.status, statusLabel: statusBatch.freshness.label, remainingDays: statusBatch.freshness.remainingDays, latestPurchasedAt: sortedBatches[0]?.purchasedAt || '' }
  }).sort((left, right) => freshnessRank[left.status] - freshnessRank[right.status] || right.latestPurchasedAt.localeCompare(left.latestPurchasedAt))
}

export const getStorageModeLabel = (mode: IngredientInventoryBatch['storageMode']) => mode === 'frozen' ? '冷冻' : mode === 'room' ? '常温' : '冷藏'
export const getInventorySourceLabel = (batch: IngredientInventoryBatch) => batch.sourceType === 'recipe' ? `来自：${batch.recipeTitle || '菜谱'}` : '手动录入'
export const getStatusCaption = (group: IngredientGroup) => {
  if (group.status === 'expired') return '有批次已过期'
  if (group.status === 'expiring') return group.remainingDays <= 0 ? '今天到期' : `还有 ${group.remainingDays} 天到期`
  if (group.status === 'normal') return '状态一般'
  return '状态良好'
}
