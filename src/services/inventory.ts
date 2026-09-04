import type { Ingredient, IngredientInventoryBatch, InventorySourceType } from '@/types'
import { formatDate } from './menu'
import { createInventoryRemote, deleteInventoryRemote, getInventoryRemote, updateInventoryRemote } from './api'
import { getIngredientConfig } from './ingredient-config'
import { getIngredientCategory } from '@/constants/ingredients'
import { enrichIngredient, getIngredientKey } from './ingredient-matching'

export interface InventoryBatchInput {
  name: string
  category?: string
  purchasedAt: string
  sourceType: InventorySourceType
  recipeId?: string
  recipeTitle?: string
  basketItemId?: string
  ingredientKey?: string
  storageMode?: 'room' | 'chilled' | 'frozen'
  expiresAt?: string
}

export const normalizeIngredientName = (name: string) => name.trim().replace(/\s+/g, '').toLowerCase()

/** 库存服务只负责请求后端；库存状态统一由 InventoryStore 持有。 */
export const fetchInventoryBatches = () => getInventoryRemote()

export const createInventoryBatch = async (input: InventoryBatchInput) => {
  const storageMode = input.storageMode || 'chilled'
  const category = input.category || getIngredientCategory(input.name)
  const ingredient = enrichIngredient({ id: `ingredient-${Date.now()}`, name: input.name.trim(), amount: '' })
  const expiresAt = input.expiresAt || calculateExpiresAt(input.purchasedAt || formatDate(), input.name, category, storageMode)
  return createInventoryRemote({
    name: input.name.trim(),
    normalizedName: normalizeIngredientName(input.name),
    category,
    purchasedAt: input.purchasedAt || formatDate(),
    sourceType: input.sourceType,
    recipeId: input.recipeId,
    recipeTitle: input.recipeTitle,
    basketItemId: input.basketItemId,
    ingredientKey: input.ingredientKey || ingredient.ingredientKey || getIngredientKey(input.name),
    storageMode,
    expiresAt,
  })
}

export const updateInventoryBatchRemote = async (id: string, input: Omit<InventoryBatchInput, 'sourceType' | 'recipeId' | 'recipeTitle' | 'basketItemId'>) => {
  return updateInventoryRemote(id, {
    ...input,
    sourceType: 'manual',
    ingredientKey: input.ingredientKey || getIngredientKey(input.name),
    expiresAt: input.expiresAt || calculateExpiresAt(input.purchasedAt, input.name, input.category || getIngredientCategory(input.name), input.storageMode || 'chilled'),
  })
}

export const removeInventoryBatchRemote = (id: string) => deleteInventoryRemote(id)

/** 菜单和菜篮子只关心食材是否存在，不再比较库存数量。过期批次不算可用食材。 */
export const hasUsableIngredient = (batches: readonly IngredientInventoryBatch[], ingredient: Pick<Ingredient, 'name' | 'ingredientKey'>) => {
  const key = ingredient.ingredientKey || getIngredientKey(ingredient.name)
  const normalized = normalizeIngredientName(ingredient.name)
  return batches.some((batch) => {
    if (getFreshness(batch).status === 'expired') return false
    const batchKey = batch.ingredientKey || getIngredientKey(batch.name)
    return batchKey === key || batch.normalizedName === normalized
  })
}

export const calculateExpiresAt = (purchasedAt: string, name: string, category: string, storageMode: 'room' | 'chilled' | 'frozen') => {
  const config = getIngredientConfig(name, category)
  const days = storageMode === 'room' ? config.roomDays : storageMode === 'frozen' ? config.frozenDays : config.fridgeDays
  const [year, month, day] = purchasedAt.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + Math.max(0, days))
  return date.toISOString().slice(0, 10)
}

export type FreshnessStatus = 'fresh' | 'normal' | 'expiring' | 'expired'

const shelfLifeDays: Record<string, number> = {
  叶菜: 3,
  蔬菜: 5,
  肉类: 3,
  肉禽: 3,
  水产: 1,
  水果: 7,
  蛋类: 21,
  豆制品: 2,
  调味品: 90,
  其他: 7
}

const dayStart = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
}

export const getFreshness = (batch: IngredientInventoryBatch, today = formatDate()) => {
  const expiresAt = batch.expiresAt || calculateExpiresAt(batch.purchasedAt, batch.name, batch.category, batch.storageMode || 'chilled')
  const remainingDays = Math.floor((dayStart(expiresAt) - dayStart(today)) / 86400000)
  const life = Math.max(1, Math.floor((dayStart(expiresAt) - dayStart(batch.purchasedAt)) / 86400000))
  let status: FreshnessStatus = 'fresh'
  if (remainingDays <= 0) status = 'expired'
  else if (remainingDays / life <= .2) status = 'expiring'
  else if (remainingDays / life <= .5) status = 'normal'
  return { status, remainingDays, label: status === 'fresh' ? '新鲜' : status === 'normal' ? '一般' : status === 'expiring' ? '即将过期' : '已过期' }
}
