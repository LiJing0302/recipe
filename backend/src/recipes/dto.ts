import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'

export class RecipeCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name!: string
}

export class IngredientConversionSnapshotDto {
  @IsString()
  unit!: string

  @IsIn(['g', 'ml', 'count'])
  baseUnit!: 'g' | 'ml' | 'count'

  @IsString()
  perUnitValue!: string
}

export class IngredientAmountDto {
  @IsString()
  raw!: string

  @IsIn(['fixed', 'range', 'qualitative'])
  type!: 'fixed' | 'range' | 'qualitative'

  @IsOptional()
  @IsString()
  value?: string

  @IsOptional()
  @IsString()
  minValue?: string

  @IsOptional()
  @IsString()
  maxValue?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  baseValue?: string

  @IsOptional()
  @IsIn(['g', 'ml', 'count'])
  baseUnit?: 'g' | 'ml' | 'count'

  @IsIn(['exact', 'configured', 'none'])
  conversion!: 'exact' | 'configured' | 'none'

  @IsOptional()
  @ValidateNested()
  @Type(() => IngredientConversionSnapshotDto)
  sourceConversion?: IngredientConversionSnapshotDto
}

export class IngredientDto {
  @IsString()
  @MinLength(1)
  name!: string

  @ValidateNested()
  @Type(() => IngredientAmountDto)
  amount!: IngredientAmountDto

  @IsOptional()
  @IsBoolean()
  optional?: boolean

  @IsOptional()
  @IsString()
  ingredientKey?: string

  @IsOptional()
  @IsString()
  sourceName?: string

  @IsOptional()
  @IsIn(['exact', 'alias', 'ai', 'manual'])
  matchMethod?: 'exact' | 'alias' | 'ai' | 'manual'

  @IsOptional()
  @IsNumber()
  confidence?: number
}

export class IngredientMappingDto {
  @IsString()
  sourceName!: string

  @IsString()
  ingredientKey!: string

  @IsOptional()
  @IsString()
  targetName?: string

  @IsOptional()
  @IsString()
  targetCategory?: string

  @IsIn(['exact', 'alias', 'ai', 'manual'])
  matchMethod!: 'exact' | 'alias' | 'ai' | 'manual'

  @IsOptional()
  @IsNumber()
  confidence?: number

}

export class ImportRecipeDto {
  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientMappingDto)
  ingredientMappings?: IngredientMappingDto[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clearedIngredientNames?: string[]
}

export class RecipeStepDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsString()
  @MinLength(1)
  description!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number

  @IsOptional()
  @IsString()
  tip?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]
}

export class CreateRecipeDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsOptional()
  @IsString()
  subtitle?: string

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  cover?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients!: IngredientDto[]

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps!: RecipeStepDto[]

  @IsArray()
  @IsString({ each: true })
  tags!: string[]

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categories!: string[]

  @IsString()
  flavor!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  servings!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration!: number

  @IsString()
  @IsIn(['简单', '中等', '进阶'])
  difficulty!: string

  @IsBoolean()
  isPublic!: boolean
}
