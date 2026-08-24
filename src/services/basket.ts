import type { BasketPendingItem, Ingredient } from '@/types'
import { addBasketItemRemote, deleteBasketItemRemote, deleteBasketRecipeRemote, getBasketRemote, purchaseBasketRemote, type RemotePurchaseItem } from './api'
import { fetchRecipe, fetchRecipeDetails } from './recipe'
import { enrichIngredient, migrateIngredientAmount } from './ingredient-matching'

const basketMemory: BasketPendingItem[] = []
export const loadBasket = async () => {
  const items = await getBasketRemote()
  basketMemory.splice(0, basketMemory.length, ...items)
  return basketMemory
}
export const getBasketRecipes = () => basketMemory
export const getBasketIngredientCount = () => basketMemory.length

export const addRecipeToBasket = async (recipeId: string, _date?: string, ingredientIds?: string[]) => {
  const recipe = await fetchRecipeDetails(recipeId)
  const existingIngredients = new Set(basketMemory.filter((item) => item.recipeId === recipeId).map((item) => item.ingredientId))
  const selected = ingredientIds ? new Set(ingredientIds) : undefined
  const candidates = recipe.ingredients.filter((ingredient) => !existingIngredients.has(ingredient.id) && (!selected || selected.has(ingredient.id)))
  const items = await Promise.all(candidates.map(async (ingredient) => {
    const normalized = enrichIngredient(ingredient)
    return addBasketItemRemote({
      ingredientId: ingredient.id,
      ingredientName: normalized.name,
      ingredientKey: normalized.ingredientKey,
      amount: normalized.amount,
      ...(normalized.amount.sourceConversion ? { sourceConversion: normalized.amount.sourceConversion } : {}),
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeCover: recipe.cover
    })
  }))
  items.forEach((item) => { if (!basketMemory.some((current) => current.id === item.id)) basketMemory.unshift(item) })
  return items
}

export const removeRecipeFromBasket = async (id: string) => {
  await deleteBasketItemRemote(id)
  const index = basketMemory.findIndex((item) => item.id === id)
  if (index >= 0) basketMemory.splice(index, 1)
}

export const removeRecipeFromBasketByRecipeId = async (recipeId: string, _date?: string) => {
  await deleteBasketRecipeRemote(recipeId)
  for (let index = basketMemory.length - 1; index >= 0; index -= 1) if (basketMemory[index].recipeId === recipeId) basketMemory.splice(index, 1)
}

export const purchaseBasketItem = async (id: string, input: RemotePurchaseItem) => {
  const result = await purchaseBasketRemote([{ ...input, basketItemId: id }])
  await loadBasket()
  return result.batches[0]
}

export const purchaseBasketItems = async (ids: string[], input: Omit<RemotePurchaseItem, 'basketItemId'>) => {
  const result = await purchaseBasketRemote(ids.map((basketItemId) => ({ ...input, basketItemId })))
  ids.forEach((id) => { const index = basketMemory.findIndex((item) => item.id === id); if (index >= 0) basketMemory.splice(index, 1) })
  return result
}

export const getPendingAmount = (amount: BasketPendingItem['amount']) => migrateIngredientAmount(amount, '')
