import { INGREDIENT_CATEGORIES, INGREDIENT_CATALOG, getIngredientsByCategory, type IngredientCategory } from '@/constants/ingredients'
import { createIngredientCategoryRemote, deleteIngredientCategoryRemote, getIngredientCategoriesRemote, updateIngredientCategoryRemote } from './api'

export const SYSTEM_CATEGORIES = INGREDIENT_CATEGORIES
const customCategories = new Map<string, { id: string; position: number }>()
export const loadIngredientCategories = async () => {
  const categories = await getIngredientCategoriesRemote()
  customCategories.clear()
  categories.forEach((category) => customCategories.set(category.name, { id: category.id, position: category.position }))
  return getAllIngredientCategories()
}
export const getAllIngredientCategories = (): string[] => [...SYSTEM_CATEGORIES, ...[...customCategories.keys()].filter((name) => !SYSTEM_CATEGORIES.includes(name as IngredientCategory))]
export const addIngredientCategory = async (name: string) => {
  const trimmed = name.trim()
  if (!trimmed || getAllIngredientCategories().includes(trimmed)) return false
  const created = await createIngredientCategoryRemote(trimmed)
  customCategories.set(created.name, { id: created.id, position: created.position })
  return true
}
export const renameIngredientCategory = async (oldName: string, newName: string) => {
  const trimmed = newName.trim()
  const current = customCategories.get(oldName)
  if (!current || !trimmed || getAllIngredientCategories().some((name) => name !== oldName && name === trimmed)) return false
  const updated = await updateIngredientCategoryRemote(current.id, trimmed)
  customCategories.delete(oldName); customCategories.set(updated.name, { id: updated.id, position: updated.position })
  return true
}
export const removeIngredientCategory = async (name: string) => {
  const current = customCategories.get(name)
  if (!current) return
  await deleteIngredientCategoryRemote(current.id)
  customCategories.delete(name)
}
export const getCatalogCountByCategory = (category: string): number => SYSTEM_CATEGORIES.includes(category as IngredientCategory) ? getIngredientsByCategory(category as IngredientCategory).length : INGREDIENT_CATALOG.filter((item) => item.category === category).length
