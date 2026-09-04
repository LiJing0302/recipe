import { clearCookingMemory } from './cooking'
import { clearIngredientConfigMemory } from './ingredient-config'
import { clearIngredientMappingMemory } from './ingredient-matching'
import { clearMenuMemory } from './menu'
import { clearOrderMemory } from './order'
import { clearRecipeMemory } from './recipe'
import { clearFollowingMemory } from './social'

/**
 * 清理所有按登录用户归属的运行时缓存。
 * 这些数据当前只在模块内存中缓存，不应跨用户复用。
 */
export const clearAllRuntimeCaches = () => {
  clearMenuMemory()
  clearOrderMemory()
  clearCookingMemory()
  clearRecipeMemory()
  clearFollowingMemory()
  clearIngredientConfigMemory()
  clearIngredientMappingMemory()
}
