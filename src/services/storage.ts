import type { UserProfile } from '@/types'

const keys = {
  user: 'recipe-ai-user',
  authToken: 'recipe-ai-auth-token'
}

const legacyBusinessStorageKeys = [
  'recipe-ai-recipes',
  'recipe-ai-menu',
  'recipe-ai-basket',
  'recipe-ai-inventory',
  'recipe-ai-following',
  'recipe-ai-collections',
  'recipe-ai-orders',
  'recipe-ai-records',
  'recipe-ai-ingredient-categories',
  'recipe-ai-ingredient-mappings'
]

export const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const value = uni.getStorageSync(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

export const writeStorage = <T>(key: string, value: T) => {
  uni.setStorageSync(key, JSON.stringify(value))
}

export const getCurrentUser = (): UserProfile => readStorage<UserProfile>(keys.user, {
  id: 'me',
  name: '林小满',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
  bio: '把每天的一餐，做成值得记住的事。',
  cookingDays: 18,
  totalCooking: 36,
  favoriteCount: 12
})

export const saveCurrentUser = (user: UserProfile) => writeStorage(keys.user, user)
export const getAuthToken = () => readStorage<string>(keys.authToken, '')
export const saveAuthSession = (token: string, user: UserProfile) => { writeStorage(keys.authToken, token); saveCurrentUser(user) }
export const clearAuthSession = () => uni.removeStorageSync(keys.authToken)
export const isAuthenticated = () => Boolean(getAuthToken())
const BUSINESS_DATA_CLEANUP_VERSION = 'recipe-ai-business-api-v1'
export const clearLegacyBusinessDataOnce = () => {
  if (readStorage<string>('recipe-ai-business-data-cleanup', '') === BUSINESS_DATA_CLEANUP_VERSION) return
  legacyBusinessStorageKeys.forEach((key) => uni.removeStorageSync(key))
  writeStorage('recipe-ai-business-data-cleanup', BUSINESS_DATA_CLEANUP_VERSION)
}
export { keys }
