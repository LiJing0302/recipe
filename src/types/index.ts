export type RecipeSource = 'official' | 'user' | 'douguo' | 'community'
export type IngredientMatchMethod = 'exact' | 'alias' | 'ai' | 'manual'
export type RecipeDifficulty = '简单' | '中等' | '进阶'
export type IngredientAmountType = 'fixed' | 'range' | 'qualitative'
export type IngredientBaseUnit = 'g' | 'ml' | 'count'

export interface IngredientConversionSnapshot {
  /** 来源食谱作者配置的单位，不能直接视为当前用户配置。 */
  unit: string
  baseUnit: IngredientBaseUnit
  /** 1 个来源单位对应的基准单位数量。 */
  perUnitValue: string
}

export interface IngredientAmount {
  /** 用户原始输入，始终保留用于展示和追溯 */
  raw: string
  type: IngredientAmountType
  /** 固定数量使用 value；统一使用字符串避免小数精度问题 */
  value?: string
  minValue?: string
  maxValue?: string
  unit?: string
  /** 只有存在确定换算规则时才填写 */
  baseValue?: string
  baseUnit?: IngredientBaseUnit
  conversion: 'exact' | 'configured' | 'none'
  sourceConversion?: IngredientConversionSnapshot
}

export interface RecipeCategory {
  name: string
  count: number
}

export interface UserRecipeCategory extends RecipeCategory {
  id: string
  position: number
  isDefault: boolean
}

export interface DatabaseColumn {
  tableName: string
  name: string
  dataType: string
  udtName: string
  nullable: 'YES' | 'NO'
  defaultValue: string | null
  position: number
  description?: string
}

export interface DatabaseRelation {
  tableName: string
  columnName: string
  foreignTableName: string
  foreignColumnName: string
}

export interface DatabaseTable {
  name: string
  type: string
  columns: DatabaseColumn[]
  relations: DatabaseRelation[]
}

export interface DatabaseSchema {
  database: string
  schema: string
  updatedAt: string
  tables: DatabaseTable[]
}

export interface PublicRecipePage {
  items: Recipe[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface Ingredient {
  id: string
  name: string
  amount: IngredientAmount
  optional?: boolean
  ingredientKey?: string
  sourceName?: string
  matchMethod?: IngredientMatchMethod
  confidence?: number
}

export interface RecipeStep {
  id: string
  title: string
  description: string
  duration?: number
  tip?: string
  image?: string
  images?: string[]
}

export interface Recipe {
  id: string
  title: string
  subtitle: string
  cover: string
  source: RecipeSource
  authorId: string
  authorName: string
  authorAvatar: string
  categories?: string[]
  ingredients: Ingredient[]
  steps: RecipeStep[]
  tags: string[]
  flavor: string
  servings: number
  duration: number
  difficulty: RecipeDifficulty
  rating: number
  ratingCount: number
  favoriteCount?: number
  likeCount?: number
  commentCount?: number
  cookingCount: number
  skillLevel: number
  isPublic: boolean
  createdAt: string
  isImported?: boolean
  originRecipeId?: string
  originAuthorId?: string
  originAuthorName?: string
  importedAt?: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface MenuItem {
  id: string
  date: string
  meal: MealType
  recipeId: string
  recipeTitle: string
  cover: string
  source: string
  orderedBy?: string
  note?: string
}

export interface BasketPendingItem {
  id: string
  ingredientId: string
  ingredientName: string
  amount: IngredientAmount
  recipeId: string
  recipeTitle: string
  recipeCover: string
  addedAt: string
  ingredientKey?: string
  matchMethod?: IngredientMatchMethod
}

export interface BasketRecipe {
  id: string
  date?: string
  recipeId: string
  recipeTitle: string
  cover: string
  ingredients: Ingredient[]
  addedAt: string
}

export type InventorySourceType = 'recipe' | 'manual'

export interface IngredientInventoryBatch {
  id: string
  userId: string
  name: string
  normalizedName: string
  category: string
  purchasedAt: string
  sourceType: InventorySourceType
  recipeId?: string
  recipeTitle?: string
  basketItemId?: string
  createdAt: string
  ingredientKey?: string
  storageMode?: 'room' | 'chilled' | 'frozen'
  expiresAt?: string
}

export interface Order {
  id: string
  recipeId: string
  recipeTitle: string
  hostName: string
  guestName: string
  date: string
  note: string
  status: 'pending' | 'accepted' | 'done'
  createdAt: string
}

export interface CookingRecord {
  id: string
  recipeId: string
  recipeTitle: string
  date: string
  duration: number
  rating: number
  comment: string
  guestComment?: string
}

export interface UserProfile {
  id: string
  account?: string
  name: string
  avatar: string
  bio: string
  cookingDays: number
  totalCooking: number
  favoriteCount: number
}

export interface IngredientRecognition {
  id: string
  name: string
  amount: string
  confidence: number
}

export interface RecipeRecommendation {
  recipe: Recipe
  score: number
  reason: string
  missingIngredients: string[]
}

export interface RecipeRecommendationInput {
  ingredients: IngredientRecognition[]
  flavor?: string
}

export interface CookingAssistantInput {
  recipe: Recipe
  currentStep: number
  completedSteps: number[]
  message: string
}

export interface CookingAssistantResult {
  reply: string
  suggestedStep?: number
  shouldCompleteStep?: boolean
}

export interface AIService {
  recognizeIngredients(imageUrl: string): Promise<IngredientRecognition[]>
  recommendRecipes(input: RecipeRecommendationInput): Promise<RecipeRecommendation[]>
  chatCookingAssistant(input: CookingAssistantInput): Promise<CookingAssistantResult>
}
