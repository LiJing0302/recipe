import { Allow, IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator'

export class IngredientCategoryInput {
  @IsString() name!: string
}

export class IngredientMappingInput {
  @IsString() sourceName!: string
  @IsString() ingredientKey!: string
  @IsOptional() @IsString() targetName?: string
  @IsOptional() @IsString() targetCategory?: string
  @IsIn(['exact', 'alias', 'ai', 'manual']) matchMethod!: string
  @IsOptional() @IsNumber() confidence?: number
}

export class ImportMappingInput {
  @IsArray() @IsObject({ each: true }) ingredientMappings!: IngredientMappingInput[]
  @IsOptional() @IsArray() @IsString({ each: true }) clearedIngredientNames?: string[]
}

export class InventoryInput {
  @IsString() name!: string
  @IsOptional() @IsString() ingredientKey?: string
  @IsString() category!: string
  @IsString() purchasedAt!: string
  @IsOptional() @IsIn(['recipe', 'manual']) sourceType?: string
  @IsOptional() @IsString() recipeId?: string
  @IsOptional() @IsString() recipeTitle?: string
  @IsOptional() @IsString() basketItemId?: string
  @IsOptional() @IsIn(['room', 'chilled', 'frozen']) storageMode?: string
  @IsOptional() @IsString() expiresAt?: string
}

export class BasketItemInput {
  @IsString() ingredientId!: string
  @IsString() ingredientName!: string
  @IsOptional() @IsString() ingredientKey?: string
  @IsObject() amount!: Record<string, unknown>
  @IsOptional() @IsObject() sourceConversion?: Record<string, unknown>
  @IsString() recipeId!: string
  @IsString() recipeTitle!: string
  @IsString() recipeCover!: string
}

export class PurchaseInput {
  @IsArray() @IsObject({ each: true }) items!: Array<InventoryInput & { basketItemId: string }>
}

export class MenuInput {
  @IsString() date!: string
  @IsIn(['breakfast', 'lunch', 'dinner']) meal!: string
  @IsString() recipeId!: string
  @IsOptional() @IsString() orderedBy?: string
  @IsOptional() @IsString() note?: string
}

export class OrderInput {
  @IsString() recipeId!: string
  @IsString() recipeTitle!: string
  @IsString() hostName!: string
  @IsString() guestName!: string
  @IsString() date!: string
  @IsString() note!: string
  @IsOptional() @IsIn(['pending', 'accepted', 'done']) status?: string
}

export class OrderStatusInput {
  @IsIn(['pending', 'accepted', 'done']) status!: string
}

export class CookingInput {
  @IsString() recipeId!: string
  @IsString() recipeTitle!: string
  @IsString() date!: string
  @IsNumber() duration!: number
  @IsNumber() rating!: number
  @IsString() comment!: string
  @IsOptional() @IsString() guestComment?: string
}

export class GenericBody {
  @Allow() value?: unknown
}
