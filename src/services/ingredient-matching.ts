import { findIngredient, INGREDIENT_CATALOG, searchIngredients } from '@/constants/ingredients'
import { getIngredientCategory } from '@/constants/ingredients'
import { getConfiguredIngredientOptions, getIngredientConfig } from './ingredient-config'
import { deleteIngredientMappingRemote, getIngredientMappingsRemote, saveIngredientMappingRemote } from './api'
import type { Ingredient, IngredientAmount, IngredientAmountType, IngredientConversionSnapshot, IngredientMatchMethod } from '@/types'

export interface IngredientMatch {
  ingredientKey: string
  name: string
  category: string
  unit: string
  method: IngredientMatchMethod
  confidence: number
}

export type IngredientMappingPayload = {
  sourceName: string
  ingredientKey: string
  targetName?: string
  targetCategory?: string
  matchMethod: IngredientMatchMethod
  confidence?: number
}

export interface IngredientMappingPreview {
  ingredient: Ingredient
  status: 'matched' | 'unmatched' | 'kept'
  mapping?: IngredientMappingPayload
  target?: IngredientMatch
  candidates: IngredientMatch[]
}

export type ParsedIngredientAmount = IngredientAmount

const normalize = (value: string) => value.trim().replace(/[\s·、，,。！？!?:：/\\]/g, '').toLowerCase()
const keyFor = (name: string) => `ingredient:${normalize(name)}`
type SavedMapping = { ingredientKey: string; targetName?: string; targetCategory?: string; matchMethod: IngredientMatchMethod; confidence?: number; confirmedAt?: string }
const mappingCache = new Map<string, SavedMapping>()
const savedMapping = (sourceName: string) => mappingCache.get(normalize(sourceName))

export const loadIngredientMappingsRemote = async () => {
  const mappings = await getIngredientMappingsRemote()
  mappingCache.clear()
  mappings.forEach((mapping) => mappingCache.set(mapping.normalizedSourceName, {
    ingredientKey: mapping.ingredientKey,
    targetName: mapping.targetName,
    targetCategory: mapping.targetCategory,
    matchMethod: mapping.matchMethod,
    confidence: mapping.confidence === undefined ? undefined : Number(mapping.confidence),
    confirmedAt: mapping.confirmedAt
  }))
  return mappings
}

export const rememberIngredientMapping = async (sourceName: string, mapping: IngredientMappingPayload) => {
  const saved = {
    ingredientKey: mapping.ingredientKey,
    ...(mapping.targetName ? { targetName: mapping.targetName } : {}),
    ...(mapping.targetCategory ? { targetCategory: mapping.targetCategory } : {}),
    matchMethod: mapping.matchMethod,
    confidence: mapping.confidence,
    confirmedAt: new Date().toISOString()
  }
  mappingCache.set(normalize(sourceName), saved)
  await saveIngredientMappingRemote(sourceName, mapping)
}

export const forgetIngredientMapping = async (sourceName: string) => {
  mappingCache.delete(normalize(sourceName))
  await deleteIngredientMappingRemote(sourceName)
}

export const getIngredientKey = (name: string) => {
  const item = findIngredient(name)
  return keyFor(item?.name || name)
}

const normalizeUnit = (unit?: string) => unit ? unitAliases[unit.toLowerCase()] || unit : undefined

export const matchIngredient = (name: string): IngredientMatch | undefined => {
  const normalized = normalize(name)
  if (!normalized) return undefined
  const exact = INGREDIENT_CATALOG.find((item) => normalize(item.name) === normalized)
  const alias = exact || INGREDIENT_CATALOG.find((item) => item.aliases?.some((value) => normalize(value) === normalized))
  if (!alias) return undefined
  return {
    ingredientKey: keyFor(alias.name),
    name: alias.name,
    category: alias.category,
    unit: alias.unit,
    method: exact ? 'exact' : 'alias',
    confidence: exact ? 1 : .96
  }
}

/**
 * Returns candidates for the AI/manual fallback layer. The caller must confirm
 * a candidate before persisting it as an ingredient mapping.
 */
export const getIngredientCandidates = (name: string, limit = 5): IngredientMatch[] => searchIngredients(name, limit).map((item) => ({
  ingredientKey: keyFor(item.name),
  name: item.name,
  category: item.category,
  unit: item.unit,
  method: 'ai',
  confidence: .7
}))

const findIngredientByKey = (ingredientKey: string) => INGREDIENT_CATALOG.find((item) => keyFor(item.name) === ingredientKey)

/** 已确认过的映射，导入时直接视为成功，避免重复询问用户。 */
export const getSavedIngredientMapping = (sourceName: string): IngredientMatch | undefined => {
  const saved = savedMapping(sourceName)
  if (!saved) return undefined
  const target = findIngredientByKey(saved.ingredientKey)
  if (target) {
    return {
      ingredientKey: saved.ingredientKey,
      name: target.name,
      category: target.category,
      unit: target.unit,
      method: saved.matchMethod,
      confidence: saved.confidence ?? .7
    }
  }
  const configuredTarget = getConfiguredIngredientOptions().find((item) => item.ingredientKey === saved.ingredientKey)
  if (!configuredTarget && !saved.targetName) return undefined
  return {
    ingredientKey: saved.ingredientKey,
    name: configuredTarget?.name || saved.targetName || sourceName,
    category: configuredTarget?.category || saved.targetCategory || '其他',
    unit: '',
    method: saved.matchMethod,
    confidence: saved.confidence ?? .7
  }
}

const previewMatchedIngredient = (ingredient: Ingredient, target: IngredientMatch, mapping: IngredientMappingPayload): IngredientMappingPreview => {
  return { ingredient, status: 'matched', target, mapping, candidates: [] }
}

/** 生成导入前的食材映射预览；这里只做确定匹配，不触发任何弹窗或写入。 */
export const previewIngredientMappings = (ingredients: Ingredient[]): IngredientMappingPreview[] => ingredients.map((ingredient) => {
  const exactOrAlias = matchIngredient(ingredient.name)
  if (exactOrAlias) {
    return previewMatchedIngredient(ingredient, exactOrAlias, { sourceName: ingredient.name, ingredientKey: exactOrAlias.ingredientKey, targetName: exactOrAlias.name, targetCategory: exactOrAlias.category, matchMethod: exactOrAlias.method, confidence: exactOrAlias.confidence })
  }
  const previous = getSavedIngredientMapping(ingredient.name)
  if (previous) {
    return previewMatchedIngredient(ingredient, previous, { sourceName: ingredient.name, ingredientKey: previous.ingredientKey, targetName: previous.name, targetCategory: previous.category, matchMethod: previous.method, confidence: previous.confidence })
  }
  return { ingredient, status: 'unmatched', candidates: getIngredientCandidates(ingredient.name) }
})

export const confirmIngredientMappings = async (ingredients: Ingredient[]) => {
  const mappings: IngredientMappingPayload[] = []
  for (const ingredient of ingredients) {
    const exactOrAlias = matchIngredient(ingredient.name)
    if (exactOrAlias) {
      mappings.push({ sourceName: ingredient.name, ingredientKey: exactOrAlias.ingredientKey, targetName: exactOrAlias.name, targetCategory: exactOrAlias.category, matchMethod: exactOrAlias.method, confidence: exactOrAlias.confidence })
      continue
    }
    const previous = savedMapping(ingredient.name)
    if (previous) {
      mappings.push({ sourceName: ingredient.name, ...previous })
      continue
    }
    const candidates = getIngredientCandidates(ingredient.name)
    if (!candidates.length) continue
    const selected = await new Promise<number | undefined>((resolve) => {
      uni.showActionSheet({
        itemList: [`保留“${ingredient.name}”`, ...candidates.map((candidate) => `匹配为 ${candidate.name}`)],
        success: ({ tapIndex }) => resolve(tapIndex > 0 ? tapIndex - 1 : undefined),
        fail: () => resolve(undefined)
      })
    })
    const candidate = selected === undefined ? undefined : candidates[selected]
    if (candidate) {
      const mapping = { ingredientKey: candidate.ingredientKey, matchMethod: 'ai' as const, confidence: candidate.confidence }
      mappings.push({ sourceName: ingredient.name, ...mapping })
    }
  }
  return mappings
}

const unitAliases: Record<string, string> = {
  千克: 'kg', 公斤: 'kg', 克: 'g', 克重: 'g', 斤: '斤', 两: '两',
  毫升: 'ml', 升: 'l', 个: '个', 只: '只', 根: '根', 把: '把', 份: '份',
  袋: '袋', 瓶: '瓶', 块: '块', 包: '包', 颗: '颗', 头: '头', 盒: '盒',
  罐: '罐', 桶: '桶', 杯: '杯', 张: '张', 条: '条', 串: '串', 节: '节', 朵: '朵',
  勺: '勺', 汤匙: '勺', 大勺: '勺', 小勺: '勺', 茶匙: '勺', 勺子: '勺'
}

const chineseNumbers: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
const parseNumber = (value: string): number | undefined => {
  if (value === '半') return .5
  const fraction = value.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  if (chineseNumbers[value] !== undefined) return chineseNumbers[value]
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
const decimalString = (value: number) => Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
const amountUnits = Object.keys(unitAliases).join('|')
const amountTokenPattern = `半|\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+)?|[一二两三四五六七八九十]`
const amountUnitPattern = `kg|千克|公斤|克|斤|两|g|l|升|毫升|ml|${amountUnits}`

const withBaseUnit = (amount: Omit<IngredientAmount, 'baseValue' | 'baseUnit' | 'conversion'>, ingredientName: string): IngredientAmount => {
  const value = amount.value ? parseNumber(amount.value) : undefined
  const unit = amount.unit
  if (value === undefined || !unit) return { ...amount, conversion: 'none' }
  // Imported community recipes keep the author's conversion snapshot. It takes
  // precedence over the current user's same-named unit configuration.
  const source = amount.sourceConversion
  if (source && normalizeUnit(source.unit) === unit) {
    const perUnitValue = Number(source.perUnitValue)
    if (Number.isFinite(perUnitValue) && perUnitValue > 0) {
      return { ...amount, baseValue: decimalString(value * perUnitValue), baseUnit: source.baseUnit, conversion: 'configured' }
    }
  }
  if (unit === 'g') return { ...amount, baseValue: decimalString(value), baseUnit: 'g', conversion: 'exact' }
  if (unit === 'kg') return { ...amount, baseValue: decimalString(value * 1000), baseUnit: 'g', conversion: 'exact' }
  if (unit === '斤') return { ...amount, baseValue: decimalString(value * 500), baseUnit: 'g', conversion: 'exact' }
  if (unit === '两') return { ...amount, baseValue: decimalString(value * 50), baseUnit: 'g', conversion: 'exact' }
  if (unit === 'ml') return { ...amount, baseValue: decimalString(value), baseUnit: 'ml', conversion: 'exact' }
  if (unit === 'l') return { ...amount, baseValue: decimalString(value * 1000), baseUnit: 'ml', conversion: 'exact' }
  const config = getIngredientConfig(ingredientName, getIngredientCategory(ingredientName))
  const configuredUnit = config.extraUnits
    .filter((item) => normalizeUnit(item.unit) === unit)
    .find((item) => item.baseValue !== undefined && Number.isFinite(Number(item.baseValue)) && Number(item.baseValue) > 0)
  if (configuredUnit) {
    const baseUnit = configuredUnit.baseUnit || 'g'
    const sourceConversion: IngredientConversionSnapshot = amount.sourceConversion || { unit, baseUnit, perUnitValue: decimalString(Number(configuredUnit.baseValue)) }
    return { ...amount, baseValue: decimalString(value * Number(configuredUnit.baseValue)), baseUnit, conversion: 'configured', sourceConversion }
  }
  return { ...amount, conversion: 'none' }
}

export const parseIngredientAmount = (amount: string, ingredientName = '', unitHint = ''): ParsedIngredientAmount => {
  const raw = amount.trim()
  const text = raw.replace(/^约\s*/, '')
  const range = text.match(new RegExp(`^(${amountTokenPattern})\\s*(?:到|至|~|～|-)\\s*(${amountTokenPattern})\\s*(${amountUnitPattern})?$`, 'i'))
  if (range) {
    const min = parseNumber(range[1])
    const max = parseNumber(range[2])
    if (min !== undefined && max !== undefined) return withBaseUnit({ raw, type: 'range', minValue: decimalString(min), maxValue: decimalString(max), unit: normalizeUnit(range[3]) || normalizeUnit(unitHint) }, ingredientName)
  }
  const fixed = text.match(new RegExp(`^(${amountTokenPattern})\\s*(${amountUnitPattern})?$`, 'i'))
  if (fixed) {
    const value = parseNumber(fixed[1])
    if (value !== undefined) return withBaseUnit({ raw, type: 'fixed', value: decimalString(value), unit: normalizeUnit(fixed[2]) || normalizeUnit(unitHint) }, ingredientName)
  }
  const hinted = unitHint ? text.match(new RegExp(`^(${amountTokenPattern})\\s*.+$`, 'i')) : undefined
  if (hinted) {
    const value = parseNumber(hinted[1])
    if (value !== undefined) return withBaseUnit({ raw, type: 'fixed', value: decimalString(value), unit: normalizeUnit(unitHint) }, ingredientName)
  }
  return { raw, type: 'qualitative', unit: normalizeUnit(unitHint), conversion: 'none' }
}

export const formatIngredientAmount = (amount: IngredientAmount) => {
  if (!amount.raw) {
    const fallback = amount.type === 'range' ? `${amount.minValue || ''}～${amount.maxValue || ''}${amount.unit || ''}` : `${amount.value || ''}${amount.unit || ''}`
    return fallback || '适量'
  }
  const numericRaw = /^(?:约\s*)?(?:半|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?|[一二两三四五六七八九十])(?:\s*(?:到|至|~|～|-)?\s*(?:半|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?|[一二两三四五六七八九十])?)?$/i.test(amount.raw)
  return amount.unit && numericRaw ? `${amount.raw}${amount.unit}` : amount.raw
}

export const amountInputValue = (amount: IngredientAmount) => {
  if (!amount.raw) return ''
  if (amount.type === 'range') return `${amount.minValue || ''}～${amount.maxValue || ''}`

  // 输入框只显示数量，单位由右侧 picker 单独展示，兼容“约2把”“半勺”等原始写法。
  const raw = amount.raw.trim().replace(/^约\s*/, '')
  const parsed = raw.match(new RegExp(`^(${amountTokenPattern})\\s*${amountUnitPattern}$`, 'i'))
  if (parsed?.[1]) return parsed[1]
  if (amount.unit && raw.length > amount.unit.length && raw.toLowerCase().endsWith(amount.unit.toLowerCase())) return raw.slice(0, -amount.unit.length).trim()
  return raw
}

export const ingredientAmountValue = (amount: IngredientAmount) => amount.type === 'fixed' && amount.value !== undefined ? Number(amount.value) : undefined

export const migrateIngredientAmount = (value: unknown, ingredientName: string, unitHint = ''): IngredientAmount => {
  if (typeof value === 'string') return parseIngredientAmount(value, ingredientName, unitHint)
  if (!value || typeof value !== 'object') return parseIngredientAmount('', ingredientName, unitHint)
  const candidate = value as Partial<IngredientAmount>
  if (typeof candidate.raw === 'string' && typeof candidate.type === 'string') {
    // 派生值根据来源快照或当前用户配置重算，避免历史系统默认值继续生效。
    return withBaseUnit({ raw: candidate.raw, type: candidate.type as IngredientAmountType, value: candidate.value, minValue: candidate.minValue, maxValue: candidate.maxValue, unit: normalizeUnit(candidate.unit), sourceConversion: candidate.sourceConversion }, ingredientName)
  }
  return parseIngredientAmount(String(candidate.raw || ''), ingredientName, unitHint)
}

export const enrichIngredient = (ingredient: Ingredient | { id: string; name: string; amount: string | IngredientAmount; unit?: string; optional?: boolean; ingredientKey?: string; sourceName?: string; matchMethod?: IngredientMatchMethod; confidence?: number }): Ingredient => {
  const match = matchIngredient(ingredient.name)
  const unitHint = 'unit' in ingredient ? (ingredient as { unit?: string }).unit : undefined
  const ingredientData = { ...ingredient } as Ingredient & { unit?: string }
  delete ingredientData.unit
  const amount = migrateIngredientAmount(ingredient.amount, ingredient.name, unitHint || '')
  if (!match) return { ...ingredientData, amount, sourceName: ingredient.sourceName || ingredient.name, matchMethod: ingredient.matchMethod || 'manual' } as Ingredient
  return {
    ...ingredientData,
    name: match.name,
    amount: migrateIngredientAmount(ingredient.amount, match.name, unitHint || match.unit),
    sourceName: ingredient.sourceName || ingredient.name,
    ingredientKey: ingredient.ingredientKey || match.ingredientKey,
    matchMethod: ingredient.matchMethod || match.method,
    confidence: ingredient.confidence ?? match.confidence
  }
}
