export type StoredIngredientAmountType = 'fixed' | 'range' | 'qualitative'
export type StoredIngredientBaseUnit = 'g' | 'ml' | 'count'

export interface StoredIngredientConversionSnapshot {
  unit: string
  baseUnit: StoredIngredientBaseUnit
  perUnitValue: string
}

export interface StoredIngredientAmount {
  raw: string
  type: StoredIngredientAmountType
  value?: string
  minValue?: string
  maxValue?: string
  unit?: string
  baseValue?: string
  baseUnit?: StoredIngredientBaseUnit
  conversion: 'exact' | 'configured' | 'none'
  sourceConversion?: StoredIngredientConversionSnapshot
}

const unitAliases: Record<string, string> = {
  千克: 'kg', 公斤: 'kg', 克: 'g', 克重: 'g', 斤: '斤', 两: '两', 毫升: 'ml', 升: 'l',
  个: '个', 只: '只', 根: '根', 把: '把', 份: '份', 袋: '袋', 瓶: '瓶', 块: '块', 包: '包',
  颗: '颗', 头: '头', 盒: '盒', 罐: '罐', 桶: '桶', 杯: '杯', 张: '张', 条: '条', 串: '串', 节: '节', 朵: '朵',
  勺: '勺', 汤匙: '勺', 大勺: '勺', 小勺: '勺', 茶匙: '勺', 勺子: '勺'
}
const chineseNumbers: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
const amountToken = '半|\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+)?|[一二两三四五六七八九十]'
const amountUnit = `kg|千克|公斤|克|斤|两|g|l|升|毫升|ml|${Object.keys(unitAliases).join('|')}`

const numberValue = (value: string) => {
  if (value === '半') return .5
  const fraction = value.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  if (chineseNumbers[value] !== undefined) return chineseNumbers[value]
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
const decimal = (value: number) => Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
const normalizeUnit = (unit?: string) => unit ? unitAliases[unit.toLowerCase()] || unit : undefined

const withBase = (amount: Omit<StoredIngredientAmount, 'baseValue' | 'baseUnit' | 'conversion'>): StoredIngredientAmount => {
  const value = amount.value ? numberValue(amount.value) : undefined
  if (value === undefined || !amount.unit) return { ...amount, conversion: 'none' }
  const source = amount.sourceConversion
  if (source && normalizeUnit(source.unit) === amount.unit) {
    const perUnitValue = Number(source.perUnitValue)
    if (Number.isFinite(perUnitValue) && perUnitValue > 0) return { ...amount, baseValue: decimal(value * perUnitValue), baseUnit: source.baseUnit, conversion: 'configured' }
  }
  if (amount.unit === 'g') return { ...amount, baseValue: decimal(value), baseUnit: 'g', conversion: 'exact' }
  if (amount.unit === 'kg') return { ...amount, baseValue: decimal(value * 1000), baseUnit: 'g', conversion: 'exact' }
  if (amount.unit === '斤') return { ...amount, baseValue: decimal(value * 500), baseUnit: 'g', conversion: 'exact' }
  if (amount.unit === '两') return { ...amount, baseValue: decimal(value * 50), baseUnit: 'g', conversion: 'exact' }
  if (amount.unit === 'ml') return { ...amount, baseValue: decimal(value), baseUnit: 'ml', conversion: 'exact' }
  if (amount.unit === 'l') return { ...amount, baseValue: decimal(value * 1000), baseUnit: 'ml', conversion: 'exact' }
  return { ...amount, conversion: 'none' }
}

export const parseStoredIngredientAmount = (input: unknown, unitHint = ''): StoredIngredientAmount => {
  if (input && typeof input === 'object') {
    const candidate = input as Partial<StoredIngredientAmount>
    if (typeof candidate.raw === 'string' && typeof candidate.type === 'string') {
      const base = withBase({ raw: candidate.raw, type: candidate.type as StoredIngredientAmountType, value: candidate.value, minValue: candidate.minValue, maxValue: candidate.maxValue, unit: normalizeUnit(candidate.unit), sourceConversion: candidate.sourceConversion })
      const hasSourceSnapshot = Boolean(candidate.sourceConversion)
      return {
        ...base,
        baseValue: hasSourceSnapshot ? base.baseValue : candidate.baseValue || base.baseValue,
        baseUnit: hasSourceSnapshot ? base.baseUnit : candidate.baseUnit || base.baseUnit,
        conversion: hasSourceSnapshot ? base.conversion : candidate.conversion || base.conversion,
        sourceConversion: candidate.sourceConversion
      }
    }
  }
  const raw = typeof input === 'string' ? input.trim() : ''
  const text = raw.replace(/^约\s*/, '')
  const range = text.match(new RegExp(`^(${amountToken})\\s*(?:到|至|~|～|-)\\s*(${amountToken})\\s*(${amountUnit})?$`, 'i'))
  if (range) {
    const min = numberValue(range[1])
    const max = numberValue(range[2])
    if (min !== undefined && max !== undefined) return withBase({ raw, type: 'range', minValue: decimal(min), maxValue: decimal(max), unit: normalizeUnit(range[3]) || normalizeUnit(unitHint) })
  }
  const fixed = text.match(new RegExp(`^(${amountToken})\\s*(${amountUnit})?$`, 'i'))
  if (fixed) {
    const value = numberValue(fixed[1])
    if (value !== undefined) return withBase({ raw, type: 'fixed', value: decimal(value), unit: normalizeUnit(fixed[2]) || normalizeUnit(unitHint) })
  }
  const hinted = unitHint ? text.match(new RegExp(`^(${amountToken})\\s*.+$`, 'i')) : undefined
  if (hinted) {
    const value = numberValue(hinted[1])
    if (value !== undefined) return withBase({ raw, type: 'fixed', value: decimal(value), unit: normalizeUnit(unitHint) })
  }
  return { raw, type: 'qualitative', unit: normalizeUnit(unitHint), conversion: 'none' }
}
