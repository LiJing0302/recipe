import type { BasketPendingItem, Ingredient } from '@/types'
import { addBasketItemRemote, deleteBasketItemRemote, deleteBasketRecipeRemote, getBasketRemote, purchaseBasketRemote, type RemotePurchaseItem } from './api'
import { fetchRecipe, fetchRecipeDetails } from './recipe'
import { enrichIngredient, migrateIngredientAmount } from './ingredient-matching'

export const loadBasket = async () => {
  return getBasketRemote()
}

export const addRecipeToBasket = async (recipeId: string, _date?: string, ingredientIds?: string[], existingItems: readonly BasketPendingItem[] = []) => {
  const recipe = await fetchRecipeDetails(recipeId)
  const existingIngredients = new Set(existingItems.filter((item) => item.recipeId === recipeId).map((item) => item.ingredientId))
  const selected = ingredientIds ? new Set(ingredientIds) : undefined
  const candidates = recipe.ingredients.filter((ingredient) => !existingIngredients.has(ingredient.id) && (!selected || selected.has(ingredient.id)))
  return Promise.all(candidates.map(async (ingredient) => {
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
}

export const removeRecipeFromBasket = async (id: string) => {
  return deleteBasketItemRemote(id)
}

export const removeRecipeFromBasketByRecipeId = async (recipeId: string, _date?: string) => {
  return deleteBasketRecipeRemote(recipeId)
}

export const purchaseBasketItem = async (id: string, input: RemotePurchaseItem) => {
  const result = await purchaseBasketRemote([{ ...input, basketItemId: id }])
  return result.batches[0]
}

export const purchaseBasketItems = async (ids: string[], input: Omit<RemotePurchaseItem, 'basketItemId'>) => {
  return purchaseBasketRemote(ids.map((basketItemId) => ({ ...input, basketItemId })))
}

export const getPendingAmount = (amount: BasketPendingItem['amount']) => migrateIngredientAmount(amount, '')
