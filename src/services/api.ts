import { API_BASE_URL } from '@/config'
import type { BasketPendingItem, CookingRecord, DatabaseSchema, IngredientInventoryBatch, MenuItem, Order, PublicRecipePage, Recipe, RecipeCategory, UserProfile, UserRecipeCategory } from '@/types'
import { clearAuthSession, getAuthToken } from './storage'
import type { IngredientMappingPayload } from './ingredient-matching'

type RecipePayload = Omit<Pick<Recipe, 'title' | 'subtitle' | 'cover' | 'categories' | 'ingredients' | 'steps' | 'tags' | 'flavor' | 'servings' | 'duration' | 'difficulty' | 'isPublic'>, 'subtitle' | 'cover' | 'categories'> & { subtitle?: string; cover?: string; categories: string[] }

export interface UploadedImage {
  key: string
  url: string
}

export interface ShareLinkResponse {
  shareId: string
}

export interface AuthResponse {
  token: string
  user: UserProfile
}

export interface RemoteIngredientExtraUnit {
  unit: string
  unitKey: string
  baseUnit?: 'g' | 'ml' | 'count'
  baseValue?: number
}

export interface RemoteIngredientConfig {
  ingredientKey: string
  name: string
  category: string
  extraUnits: RemoteIngredientExtraUnit[]
  showExtraUnit: boolean
  roomDays: number
  fridgeDays: number
  frozenDays: number
  fridgeSuitable: boolean
}

export interface RemoteIngredientCategory {
  id: string
  name: string
  position: number
  isDefault: boolean
}

export interface RemoteIngredientMapping {
  id: string
  sourceName: string
  normalizedSourceName: string
  ingredientKey: string
  targetName?: string
  targetCategory?: string
  matchMethod: 'exact' | 'alias' | 'ai' | 'manual'
  confidence?: number
  confirmedAt: string
}

export interface RemotePurchaseItem {
  basketItemId: string
  category?: string
  purchasedAt: string
  storageMode?: 'room' | 'chilled' | 'frozen'
  ingredientKey?: string
  expiresAt?: string
}

const request = <T>(options: UniApp.RequestOptions) => new Promise<T>((resolve, reject) => {
  const header = {
    ...(options.data !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(getAuthToken() ? { authorization: `Bearer ${getAuthToken()}` } : {}),
    ...(options.header || {})
  }
  uni.request({
    ...options,
    url: `${API_BASE_URL}${options.url}`,
    timeout: 5000,
    header,
    success: (response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve(response.data as T)
        return
      }
      const data = response.data as { message?: string } | undefined
      if (response.statusCode === 401) clearAuthSession()
      reject(new Error(data?.message || `API ${response.statusCode}`))
    },
    fail: reject
  })
})

const toStoredIngredient = (ingredient: Recipe['ingredients'][number]) => {
  const { baseValue: _baseValue, baseUnit: _baseUnit, conversion: _conversion, ...sourceAmount } = ingredient.amount
  return { ...ingredient, amount: { ...sourceAmount, conversion: 'none' as const } }
}

const toPayload = (recipe: Recipe): RecipePayload => ({
  title: recipe.title,
  ...(recipe.subtitle.trim() ? { subtitle: recipe.subtitle.trim() } : {}),
  ...(recipe.cover.trim() ? { cover: recipe.cover.trim() } : {}),
  categories: recipe.categories || [],
  // 菜谱只保存原始数量和单位，baseValue/baseUnit 是根据用户配置实时派生的缓存。
  ingredients: recipe.ingredients.map(toStoredIngredient),
  steps: recipe.steps,
  tags: recipe.tags,
  flavor: recipe.flavor,
  servings: recipe.servings,
  duration: recipe.duration,
  difficulty: recipe.difficulty,
  isPublic: recipe.isPublic
})

export const getMyRecipesRemote = (includeImported = true) => request<Recipe[]>({ url: `/recipes/mine?includeImported=${includeImported ? 'true' : 'false'}`, method: 'GET' })
export const createShareLinkRemote = () => request<ShareLinkResponse>({ url: '/recipes/share-link', method: 'GET' })
export const registerAccount = (account: string, password: string) => request<AuthResponse>({ url: '/auth/register', method: 'POST', data: { account, password } })
export const loginAccount = (account: string, password: string) => request<AuthResponse>({ url: '/auth/login', method: 'POST', data: { account, password } })
export const getMyRecipeCategoriesRemote = () => request<UserRecipeCategory[]>({ url: '/recipes/categories/mine', method: 'GET' })
export const createRecipeCategoryRemote = (name: string) => request<UserRecipeCategory>({ url: '/recipes/categories', method: 'POST', data: { name } })
export const updateRecipeCategoryRemote = (id: string, name: string) => request<UserRecipeCategory>({ url: `/recipes/categories/${id}`, method: 'PUT', data: { name } })
export const deleteRecipeCategoryRemote = (id: string) => request<{ id: string }>({ url: `/recipes/categories/${id}/delete`, method: 'POST', data: {} })
export const getSharedRecipesRemote = (shareId: string) => request<Recipe[]>({ url: `/recipes/shared/${encodeURIComponent(shareId)}`, method: 'GET' })
export const getSharedRecipeCategoriesRemote = (shareId: string) => request<UserRecipeCategory[]>({ url: `/recipes/shared/${encodeURIComponent(shareId)}/categories`, method: 'GET' })
export const getSharedRecipeRemote = (shareId: string, recipeId: string) => request<Recipe>({ url: `/recipes/shared/${encodeURIComponent(shareId)}/${encodeURIComponent(recipeId)}`, method: 'GET' })
export const getPublicCategoriesRemote = () => request<RecipeCategory[]>({ url: '/recipes/categories', method: 'GET' })
export const getPublicRecipesRemote = (tag = '', page = 1, pageSize = 10) => request<PublicRecipePage>({ url: `/recipes/public?tag=${encodeURIComponent(tag)}&page=${page}&pageSize=${pageSize}`, method: 'GET' })
export const getDatabaseSchemaRemote = () => request<DatabaseSchema>({ url: '/database/schema', method: 'GET' })
export const getRecipeRemote = (id: string) => request<Recipe>({ url: `/recipes/${id}`, method: 'GET' })
export const createRecipeRemote = (recipe: Recipe) => request<Recipe>({ url: '/recipes', method: 'POST', data: toPayload(recipe) })
export const updateRecipeRemote = (recipe: Recipe) => request<Recipe>({ url: `/recipes/${recipe.id}`, method: 'PUT', data: toPayload(recipe) })
export const deleteRecipeRemote = (id: string) => request<{ id: string }>({ url: `/recipes/${id}/delete`, method: 'POST', data: {} })
export const importRecipeRemote = (recipeId: string, input: { category?: string; ingredientMappings?: IngredientMappingPayload[]; clearedIngredientNames?: string[] }) => request<Recipe>({ url: `/recipes/${encodeURIComponent(recipeId)}/import`, method: 'POST', data: input })
export const getIngredientCategoriesRemote = () => request<RemoteIngredientCategory[]>({ url: '/ingredient-categories', method: 'GET' })
export const createIngredientCategoryRemote = (name: string) => request<RemoteIngredientCategory>({ url: '/ingredient-categories', method: 'POST', data: { name } })
export const updateIngredientCategoryRemote = (id: string, name: string) => request<RemoteIngredientCategory>({ url: `/ingredient-categories/${encodeURIComponent(id)}`, method: 'PUT', data: { name } })
export const deleteIngredientCategoryRemote = (id: string) => request<{ id: string }>({ url: `/ingredient-categories/${encodeURIComponent(id)}`, method: 'DELETE' })
export const getIngredientMappingsRemote = () => request<RemoteIngredientMapping[]>({ url: '/ingredient-mappings', method: 'GET' })
export const saveIngredientMappingRemote = (sourceKey: string, mapping: IngredientMappingPayload) => request<RemoteIngredientMapping>({ url: `/ingredient-mappings/${encodeURIComponent(sourceKey)}`, method: 'PUT', data: mapping })
export const deleteIngredientMappingRemote = (sourceKey: string) => request<{ sourceKey: string }>({ url: `/ingredient-mappings/${encodeURIComponent(sourceKey)}`, method: 'DELETE' })
export const getInventoryRemote = () => request<IngredientInventoryBatch[]>({ url: '/inventory', method: 'GET' })
export const createInventoryRemote = (input: Record<string, unknown>) => request<IngredientInventoryBatch>({ url: '/inventory', method: 'POST', data: input })
export const updateInventoryRemote = (id: string, input: Record<string, unknown>) => request<IngredientInventoryBatch>({ url: `/inventory/${encodeURIComponent(id)}`, method: 'PUT', data: input })
export const deleteInventoryRemote = (id: string) => request<{ id: string }>({ url: `/inventory/${encodeURIComponent(id)}`, method: 'DELETE' })
export const getBasketRemote = () => request<BasketPendingItem[]>({ url: '/basket', method: 'GET' })
export const addBasketItemRemote = (input: Record<string, unknown>) => request<BasketPendingItem>({ url: '/basket/items', method: 'POST', data: input })
export const deleteBasketItemRemote = (id: string) => request<{ id: string }>({ url: `/basket/items/${encodeURIComponent(id)}`, method: 'DELETE' })
export const deleteBasketRecipeRemote = (recipeId: string) => request<{ recipeId: string }>({ url: `/basket/recipes/${encodeURIComponent(recipeId)}`, method: 'DELETE' })
export const purchaseBasketRemote = (items: RemotePurchaseItem[]) => request<{ batches: IngredientInventoryBatch[]; removedIds: string[] }>({ url: '/basket/purchase', method: 'POST', data: { items } })
export const getMenuRemote = (date?: string) => request<MenuItem[]>({ url: `/menu${date ? `?date=${encodeURIComponent(date)}` : ''}`, method: 'GET' })
export const addMenuRemote = (input: { date: string; meal: string; recipeId: string; orderedBy?: string; note?: string }) => request<MenuItem>({ url: '/menu', method: 'POST', data: input })
export const deleteMenuRemote = (id: string) => request<{ id: string }>({ url: `/menu/${encodeURIComponent(id)}`, method: 'DELETE' })
export const getFollowingRemote = () => request<string[]>({ url: '/social/following', method: 'GET' })
export const followRemote = (userId: string) => request<{ following: boolean }>({ url: `/social/following/${encodeURIComponent(userId)}`, method: 'POST', data: {} })
export const unfollowRemote = (userId: string) => request<{ following: boolean }>({ url: `/social/following/${encodeURIComponent(userId)}`, method: 'DELETE' })
export const getCollectionsRemote = () => request<string[]>({ url: '/recipes/collections', method: 'GET' })
export const collectRemote = (recipeId: string) => request<{ collected: boolean }>({ url: `/recipes/collections/${encodeURIComponent(recipeId)}`, method: 'POST', data: {} })
export const uncollectRemote = (recipeId: string) => request<{ collected: boolean }>({ url: `/recipes/collections/${encodeURIComponent(recipeId)}`, method: 'DELETE' })
export const getOrdersRemote = (date?: string) => request<Order[]>({ url: `/orders${date ? `?date=${encodeURIComponent(date)}` : ''}`, method: 'GET' })
export const createOrderRemote = (input: Omit<Order, 'id' | 'createdAt' | 'status'>) => request<Order>({ url: '/orders', method: 'POST', data: input })
export const updateOrderStatusRemote = (id: string, status: Order['status']) => request<Order>({ url: `/orders/${encodeURIComponent(id)}/status`, method: 'PUT', data: { status } })
export const getCookingRecordsRemote = () => request<CookingRecord[]>({ url: '/cooking-records', method: 'GET' })
export const createCookingRecordRemote = (input: Omit<CookingRecord, 'id' | 'recipeTitle'>) => request<CookingRecord>({ url: '/cooking-records', method: 'POST', data: input })
export const getIngredientConfigsRemote = () => request<RemoteIngredientConfig[]>({ url: '/ingredient-configs', method: 'GET' })
export const saveIngredientConfigRemote = (ingredientKey: string, config: RemoteIngredientConfig) => request<RemoteIngredientConfig>({
  url: `/ingredient-configs/${encodeURIComponent(ingredientKey)}`,
  method: 'PUT',
  data: config
})
export const deleteIngredientConfigRemote = (ingredientKey: string) => request<{ ingredientKey: string }>({
  url: `/ingredient-configs/${encodeURIComponent(ingredientKey)}`,
  method: 'DELETE'
})

const compressForUpload = (filePath: string) => new Promise<string>((resolve) => {
  let settled = false
  const fallback = () => {
    if (settled) return
    settled = true
    resolve(filePath)
  }
  const timer = setTimeout(fallback, 2500)
  try {
    if (typeof uni.compressImage !== 'function') {
      clearTimeout(timer)
      fallback()
      return
    }
    uni.compressImage({
      src: filePath,
      quality: 88,
      success: (result) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result.tempFilePath || filePath)
      },
      fail: fallback
    })
  } catch {
    clearTimeout(timer)
    fallback()
  }
})

export const uploadImage = async (filePath: string, kind: 'cover' | 'step') => {
  const preparedPath = await compressForUpload(filePath)
  return new Promise<UploadedImage>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/uploads/images`,
      filePath: preparedPath,
      name: 'file',
      formData: { kind },
      header: { ...(getAuthToken() ? { authorization: `Bearer ${getAuthToken()}` } : {}) },
      success: (response) => {
        let payload: { message?: string } | UploadedImage = {}
        try {
          payload = typeof response.data === 'string' ? JSON.parse(response.data) : response.data as UploadedImage
        } catch {
          payload = {}
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error('message' in payload && payload.message ? payload.message : `Upload API ${response.statusCode}`))
          return
        }
        resolve(payload as UploadedImage)
      },
      fail: reject
    })
  })
}
