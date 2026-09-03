import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

export interface AiResponseFormat {
  type: 'json_object' | 'json_schema'
  json_schema?: {
    name: string
    description?: string
    strict?: boolean
    schema: Record<string, unknown>
  }
}

export class CreateAiResponseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30000)
  @Matches(/\S/, { message: 'input 不能为空' })
  input!: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/\S/, { message: 'model 不能为空' })
  model?: string

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instructions?: string

  @IsOptional()
  @IsObject()
  responseFormat?: AiResponseFormat

  @IsOptional()
  @IsBoolean()
  enableThinking?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(256)
  @Max(8192)
  maxOutputTokens?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1)
  topP?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(2)
  temperature?: number

  @IsOptional()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  stop?: string | string[]

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32768)
  thinkingBudget?: number
}
