import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'

export class IngredientExtraUnitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unitKey!: string

  @IsOptional()
  @IsIn(['g', 'ml', 'count'])
  baseUnit?: 'g' | 'ml' | 'count'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseValue?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class SaveIngredientProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  ingredientKey!: string

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  category!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roomDays!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fridgeDays!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  frozenDays!: number

  @IsBoolean()
  fridgeSuitable!: boolean

  @IsBoolean()
  showExtraUnit!: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientExtraUnitDto)
  extraUnits!: IngredientExtraUnitDto[]
}
