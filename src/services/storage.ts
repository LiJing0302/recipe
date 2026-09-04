import type { UserProfile } from '@/types'

const keys = {
  user: 'recipe-ai-user',
  authToken: 'recipe-ai-auth-token'
}

const GUEST_USER: UserProfile = {
  id: 'guest',
  name: '游客',
  avatar: '',
  bio: '',
  cookingDays: 0,
  totalCooking: 0,
  favoriteCount: 0
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

export const getStoredUser = () => readStorage<UserProfile | null>(keys.user, null)
export const getAuthToken = () => readStorage<string>(keys.authToken, '')
export const getCurrentUser = (): UserProfile => {
  const user = getStoredUser()
  return getAuthToken() && user ? user : { ...GUEST_USER }
}

export const saveCurrentUser = (user: UserProfile) => writeStorage(keys.user, user)
export const saveAuthSession = (token: string, user: UserProfile) => { writeStorage(keys.authToken, token); saveCurrentUser(user) }
export const clearAuthSession = () => {
  uni.removeStorageSync(keys.authToken)
  uni.removeStorageSync(keys.user)
}
export const isAuthenticated = () => Boolean(getAuthToken())
const BUSINESS_DATA_CLEANUP_VERSION = 'recipe-ai-business-api-v1'
export const clearLegacyBusinessDataOnce = () => {
  if (readStorage<string>('recipe-ai-business-data-cleanup', '') === BUSINESS_DATA_CLEANUP_VERSION) return
  legacyBusinessStorageKeys.forEach((key) => uni.removeStorageSync(key))
  writeStorage('recipe-ai-business-data-cleanup', BUSINESS_DATA_CLEANUP_VERSION)
}
export { keys }
