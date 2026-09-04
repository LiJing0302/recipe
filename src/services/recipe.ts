import type { Recipe, RecipeCategory } from '@/types'
import { getCurrentUser } from './storage'
import { confirmIngredientMappings, enrichIngredient, type IngredientMappingPayload } from './ingredient-matching'
import { collectRemote, createRecipeCategoryRemote, createRecipeRemote as createRecipeApi, createShareLinkRemote, deleteRecipeCategoryRemote, deleteRecipeRemote as deleteRecipeApi, getCollectionsRemote, getMyRecipeCategoriesRemote, getMyRecipesRemote, getPublicCategoriesRemote, getPublicRecipesRemote, getRecipeRemote, getSharedRecipeCategoriesRemote, getSharedRecipeRemote, getSharedRecipesRemote, importRecipeRemote, uncollectRemote, updateRecipeCategoryRemote, updateRecipeRemote as updateRecipeApi } from './api'

const LEGACY_MOCK_RECIPE_IDS = new Set(['recipe-tomato-egg', 'recipe-broccoli-garlic', 'recipe-potato-beef', 'recipe-pumpkin-soup'])
export const isLegacyMockRecipe = (id: string) => LEGACY_MOCK_RECIPE_IDS.has(id)
const recipeMemory = new Map<string, Recipe>()
const getRecipes = () => [...recipeMemory.values()]
const hasRecipeDetails = (recipe: Recipe) => recipe.ingredients.length > 0 && recipe.steps.length > 0
const normalizeRecipe = (recipe: Recipe): Recipe => ({ ...recipe, ingredients: (recipe.ingredients || []).map((ingredient) => enrichIngredient(ingredient as never)) })
const rememberRecipes = (recipes: Recipe[]) => recipes.forEach((recipe) => recipeMemory.set(recipe.id, normalizeRecipe(recipe)))

export const getCommunityRecipes = (keyword = '') => {
  const normalized = keyword.trim().toLowerCase()
  return getRecipes().filter((recipe) => recipe.isPublic && (!normalized || [recipe.title, recipe.subtitle, ...recipe.tags].join('').toLowerCase().includes(normalized)))
}
export const fetchCommunityRecipes = async (keyword = '') => {
  const page = await getPublicRecipesRemote('', 1, 60)
  // Public list responses are summaries; cache only complete recipes so detail pages do not reuse empty fields.
  rememberRecipes(page.items.filter(hasRecipeDetails))
  const normalized = keyword.trim().toLowerCase()
  return page.items.filter((recipe) => !normalized || [recipe.title, recipe.subtitle, ...recipe.tags].join('').toLowerCase().includes(normalized))
}

export const fetchPublicRecipeCategories = () => getPublicCategoriesRemote()

export const getRecipeDetail = (id: string) => getRecipes().find((recipe) => recipe.id === id)
export const getMyRecipes = () => getRecipes().filter((recipe) => recipe.authorId === getCurrentUser().id || collectionMemory.has(recipe.id))

export const cacheRecipe = (recipe: Recipe) => {
  const normalized = normalizeRecipe(recipe)
  recipeMemory.set(normalized.id, normalized)
  return normalized
}

export const syncMyRecipes = (recipes: Recipe[]) => {
  rememberRecipes(recipes)
  return recipes
}

export const fetchMyRecipes = async (includeImported = true) => syncMyRecipes(await getMyRecipesRemote(includeImported))
export const fetchMyRecipeCategories = () => getMyRecipeCategoriesRemote()
export const createShareLink = () => createShareLinkRemote()
export const fetchSharedRecipes = async (shareId: string) => syncMyRecipes(await getSharedRecipesRemote(shareId))
export const fetchSharedRecipeCategories = (shareId: string) => getSharedRecipeCategoriesRemote(shareId)
export const createRecipeCategory = (name: string) => createRecipeCategoryRemote(name)
export const updateRecipeCategory = (id: string, name: string) => updateRecipeCategoryRemote(id, name)
export const deleteRecipeCategory = (id: string) => deleteRecipeCategoryRemote(id)
export const fetchRecipe = async (id: string) => cacheRecipe(await getRecipeRemote(id))
export const fetchRecipeDetails = async (id: string) => {
  const cached = getRecipeDetail(id)
  return cached && hasRecipeDetails(cached) ? cached : fetchRecipe(id)
}
export const fetchSharedRecipe = async (shareId: string, id: string) => cacheRecipe(await getSharedRecipeRemote(shareId, id))
export const createRecipeRemote = (recipe: Recipe) => createRecipeApi(recipe).then(cacheRecipe)
export const importCommunityRecipe = async (recipeId: string, category?: string, confirmedMappings?: IngredientMappingPayload[], clearedIngredientNames: string[] = []) => {
  const ingredientMappings = confirmedMappings ?? await confirmIngredientMappings((await fetchRecipeDetails(recipeId)).ingredients)
  return importRecipeRemote(recipeId, { ...(category ? { category } : {}), ...(ingredientMappings.length ? { ingredientMappings } : {}), ...(clearedIngredientNames.length ? { clearedIngredientNames } : {}) }).then(cacheRecipe)
}
export const updateRecipeRemote = (recipe: Recipe) => updateRecipeApi(recipe).then(cacheRecipe)
export const saveRecipeRemote = (recipe: Recipe) => getRecipeDetail(recipe.id) ? updateRecipeRemote(recipe) : createRecipeRemote(recipe)
const collectionMemory = new Set<string>()
let collectionsLoaded = false
export const clearRecipeMemory = () => {
  recipeMemory.clear()
  collectionMemory.clear()
  collectionsLoaded = false
}

export const loadCollections = async () => { const ids = await getCollectionsRemote(); collectionMemory.clear(); ids.forEach((id) => collectionMemory.add(id)); collectionsLoaded = true; return ids }
export const isCollected = (id: string) => collectionMemory.has(id)

export const toggleCollection = async (id: string) => {
  const collected = isCollected(id)
  if (collected) await uncollectRemote(id)
  else await collectRemote(id)
  if (collected) collectionMemory.delete(id); else collectionMemory.add(id)
  collectionsLoaded = true
  return !collected
}

export const createRecipe = (recipe: Recipe) => {
  recipeMemory.set(recipe.id, recipe)
  return recipe
}

export const updateRecipe = (recipe: Recipe) => {
  recipeMemory.set(recipe.id, recipe)
  return recipe
}

export const deleteRecipe = (id: string) => {
  const recipe = getRecipeDetail(id)
  recipeMemory.delete(id)
  return recipe
}

export const deleteRecipeRemote = (id: string) => deleteRecipeApi(id).then(() => { deleteRecipe(id); return id })

export const publishRecipe = (id: string, isPublic: boolean) => {
  const recipe = getRecipeDetail(id)
  if (!recipe) return undefined
  return updateRecipe({ ...recipe, isPublic })
}
