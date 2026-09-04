/** 用户食材配置：后端是唯一真实来源，本地只保留运行时内存缓存。 */
import { findIngredient, INGREDIENT_CATALOG, type IngredientCategory } from '@/constants/ingredients'
import { deleteIngredientConfigRemote, getIngredientConfigsRemote, saveIngredientConfigRemote, type RemoteIngredientConfig } from './api'
import { getAuthToken } from './storage'

/**
 * 某种食材可以使用的一个额外计量单位。
 *
 * 例如用户给“生抽”配置“勺”：
 * {
 *   unit: '勺',
 *   unitKey: '勺',
 *   baseUnit: 'g',
 *   baseValue: 7
 * }
 * 表示：1 勺生抽按 7g 参与库存汇总。
 *
 * 如果只写 unit，不写 baseUnit/baseValue：
 * - 这个单位仍然可以在食谱中选择；
 * - 但系统不会猜测它等于多少克或毫升；
 * - 菜篮子遇到这个单位时不能自动换算。
 */
export interface IngredientExtraUnit {
  /** 用户看到的单位名称，例如“个”“把”“勺”“瓶”。 */
  unit: string
  /** 用于匹配同一单位的稳定名称，通常由 unit 标准化得到。 */
  unitKey?: string
  /** 换算后的基准量纲：克、毫升或数量。只有填写 baseValue 时才有意义。 */
  baseUnit?: 'g' | 'ml' | 'count'
  /** 1 个当前单位对应多少基准单位；不填写表示明确不换算。 */
  baseValue?: number
}

/**
 * 用户对一种食材的完整配置。
 *
 * 可以把它理解为“食材说明书”：
 * - extraUnits 决定食谱和库存里能选什么单位；
 * - baseValue 决定某个单位能不能参与换算；
 * - roomDays/fridgeDays/frozenDays 决定不同保存方式下的保鲜期。
 */
export interface IngredientConfig {
  /**
   * 该食材的可选额外单位。
   * 当前项目暂时使用第一项作为默认展示单位，例如第一项是“个”，页面默认显示“个”。
   * 长期可以拆出独立的 defaultUnit 字段，让额外单位只负责可选项。
   */
  extraUnits: IngredientExtraUnit[]
  /** 是否在食谱和库存的单位选择器中展示 extraUnits。 */
  showExtraUnit: boolean
  /** 常温保存时的默认保鲜天数。 */
  roomDays: number
  /** 冷藏保存时的默认保鲜天数；为 0 表示不按冷藏计算。 */
  fridgeDays: number
  /** 冷冻保存时的默认保鲜天数。 */
  frozenDays: number
  /** 是否建议用户将该食材放入冰箱。 */
  fridgeSuitable: boolean
}

export interface ConfiguredIngredientOption {
  ingredientKey: string
  name: string
  category: string
}

const CATEGORY_DEFAULT: Record<IngredientCategory, { room: number; fridge: number; frozen: number; fridgeSuitable: boolean }> = {
  蔬菜: { room: 2, fridge: 5, frozen: 30, fridgeSuitable: true },
  菌菇: { room: 1, fridge: 4, frozen: 30, fridgeSuitable: true },
  肉类: { room: 1, fridge: 3, frozen: 90, fridgeSuitable: true },
  水产: { room: 1, fridge: 2, frozen: 60, fridgeSuitable: true },
  蛋奶: { room: 7, fridge: 21, frozen: 30, fridgeSuitable: true },
  豆制品: { room: 1, fridge: 3, frozen: 30, fridgeSuitable: true },
  水果: { room: 5, fridge: 7, frozen: 30, fridgeSuitable: true },
  主食: { room: 7, fridge: 14, frozen: 60, fridgeSuitable: true },
  干货: { room: 180, fridge: 0, frozen: 180, fridgeSuitable: false },
  调味品: { room: 180, fridge: 0, frozen: 180, fridgeSuitable: false },
  其他: { room: 3, fridge: 5, frozen: 30, fridgeSuitable: true }
}

const NO_FRIDGE_SPECIALS = [
  '香蕉', '芒果', '木瓜', '菠萝', '火龙果', '牛油果', '释迦', '榴莲',
  '土豆', '洋葱', '大蒜', '红薯', '南瓜', '芋头', '山药', '生姜',
  '冬瓜', '青椒', '尖椒', '丝瓜'
]

const normalize = (value: string) => value.trim().replace(/\s+/g, '').toLowerCase()
const ingredientKeyFor = (name: string) => `ingredient:${normalize(findIngredient(name)?.name || name)}`
const categoryFor = (name: string) => findIngredient(name)?.category || '其他'
const remoteConfigs = new Map<string, IngredientConfig>()
const remoteIngredientMeta = new Map<string, Omit<ConfiguredIngredientOption, 'ingredientKey'>>()

export const clearIngredientConfigMemory = () => {
  remoteConfigs.clear()
  remoteIngredientMeta.clear()
}

type BaseUnit = NonNullable<IngredientExtraUnit['baseUnit']>
type DefaultUnitDefinition = { unit: string; baseUnit?: BaseUnit; baseValue?: number }
const QUALITATIVE_UNIT = '适量'

const unitDefinition = (unit: string, baseUnit?: BaseUnit, baseValue?: number): DefaultUnitDefinition => ({ unit, ...(baseUnit ? { baseUnit } : {}), ...(baseValue === undefined ? {} : { baseValue }) })
const uniqueUnitDefinitions = (units: DefaultUnitDefinition[]) => units.filter((unit, index, list) => list.findIndex((item) => normalize(item.unit) === normalize(unit.unit)) === index)
const withQualitativeUnit = <T extends { unit: string }>(units: T[]): T[] => {
  if (units.some((unit) => normalize(unit.unit) === normalize(QUALITATIVE_UNIT))) return units
  return [...units, { unit: QUALITATIVE_UNIT } as T]
}

/* 这些食材适合用重量管理。系统只内置确定的公制 / 市制换算，其他单位不猜测。 */
const MASS_INGREDIENTS = new Set([
  '五花肉', '猪里脊', '猪排骨', '猪肉末', '猪前腿肉', '猪后腿肉', '猪肝', '肥肠', '牛肉', '牛腩', '牛里脊', '牛腱子', '肥牛卷', '羊肉', '羊排', '羊肉卷', '鸡胸肉', '鸭肉', '鹅肉', '培根', '肉丸',
  '鳕鱼', '三文鱼', '龙利鱼', '泥鳅', '虾', '对虾', '小龙虾', '虾仁', '蛤蜊', '鱿鱼', '章鱼', '墨鱼', '海带', '紫菜', '田螺',
  '豌豆', '毛豆', '黄豆芽', '绿豆芽',
  '大米', '小米', '糯米', '黑米', '糙米', '面粉', '挂面', '意面', '粉丝', '年糕', '燕麦', '饺子皮', '馄饨皮', '红薯粉', '凉皮', '米粉',
  '木耳', '银耳', '干香菇', '黄花菜', '海米', '干贝', '鱿鱼干', '笋干', '枸杞', '红枣干', '花生米', '核桃', '芝麻', '杏仁', '腰果', '板栗', '莲子', '葡萄干', '紫菜干',
  '盐', '白糖', '冰糖', '孜然', '花椒', '八角', '桂皮', '香叶', '白胡椒粉', '黑胡椒粉', '辣椒粉', '干辣椒', '淀粉', '鸡精', '豆豉', '五香粉', '十三香',
  '奶酪', '黄油', '奶粉', '黄豆', '绿豆', '红豆', '黑豆', '鹰嘴豆'
])

/* 这些食材更适合用体积管理；瓶 / 盒 / 勺等单位只展示，不预设包装规格。 */
const VOLUME_INGREDIENTS = new Set([
  '牛奶', '酸奶', '奶油', '豆浆', '生抽', '老抽', '陈醋', '料酒', '蚝油', '食用油', '香油', '橄榄油', '番茄酱', '豆瓣酱', '黄豆酱', '甜面酱', '辣椒酱', '蜂蜜', '腐乳', '芝麻酱', '花生酱', '沙拉酱', '芥末'
])

/* 额外单位没有可靠通用换算时，只维护可选名称，baseValue 留空。 */
const NON_CONVERTING_EXTRA_UNITS: Record<string, string[]> = {
  大蒜: ['瓣'],
  生姜: ['片'],
  菠菜: ['份'], 油菜: ['份'], 生菜: ['份'], 空心菜: ['份'], 芹菜: ['份'], 韭菜: ['份'], 小葱: ['份'], 香菜: ['份'], 蒜苗: ['份'], 蒜苔: ['份'], 茼蒿: ['份'], 油麦菜: ['份'],
  香菇: ['盒'], 平菇: ['盒'], 金针菇: ['盒'], 杏鲍菇: ['盒'], 口蘑: ['盒'], 蟹味菇: ['盒'], 海鲜菇: ['盒'],
  猪蹄: ['份'], 鸡腿: ['份'], 鸡翅: ['份'], 鸡翅根: ['份'], 整鸡: ['份'], 鸭腿: ['份'], 腊肉: ['份'], 腊肠: ['份'], 火腿: ['份'], 午餐肉: ['份'],
  鸡蛋: ['枚'], 鸭蛋: ['枚'], 咸鸭蛋: ['枚'], 皮蛋: ['枚'], 鹌鹑蛋: ['枚'],
  牛奶: ['盒', '杯'], 酸奶: ['盒', '杯'], 奶油: ['盒', '杯'], 豆浆: ['杯'],
  生抽: ['瓶', '勺'], 老抽: ['瓶', '勺'], 陈醋: ['瓶', '勺'], 料酒: ['瓶', '勺'], 蚝油: ['瓶', '勺'], 食用油: ['桶', '瓶', '勺'], 香油: ['瓶', '勺'], 橄榄油: ['瓶', '勺'], 番茄酱: ['瓶', '勺'], 豆瓣酱: ['瓶', '勺'], 黄豆酱: ['瓶', '勺'], 甜面酱: ['瓶', '勺'], 辣椒酱: ['瓶', '勺'], 蜂蜜: ['瓶', '勺'], 腐乳: ['瓶'], 芝麻酱: ['瓶', '勺'], 花生酱: ['瓶', '勺'], 沙拉酱: ['瓶', '勺'], 芥末: ['瓶', '勺']
}

const getDefaultUnitDefinitions = (name: string, category: string): DefaultUnitDefinition[] => {
  const catalogUnit = INGREDIENT_CATALOG.find((item) => item.name === name)?.unit || 'g'
  const defaultUnit = MASS_INGREDIENTS.has(name) ? 'g' : VOLUME_INGREDIENTS.has(name) ? 'ml' : catalogUnit
  const exactUnits = MASS_INGREDIENTS.has(name)
    ? [unitDefinition('kg', 'g', 1000), unitDefinition('斤', 'g', 500), unitDefinition('两', 'g', 50)]
    : VOLUME_INGREDIENTS.has(name)
      ? [unitDefinition('L', 'ml', 1000)]
      : []
  const extras = (NON_CONVERTING_EXTRA_UNITS[name] || []).map((unit) => unitDefinition(unit))
  const definitions = withQualitativeUnit(uniqueUnitDefinitions([unitDefinition(defaultUnit), ...exactUnits, ...extras]))
  return definitions.length ? definitions : [unitDefinition(category ? 'g' : '份')]
}

export const getDefaultIngredientConfig = (name: string, category: string): IngredientConfig => {
  const defaults = CATEGORY_DEFAULT[(category as IngredientCategory)] || CATEGORY_DEFAULT.其他
  const fridgeSuitable = defaults.fridgeSuitable && !NO_FRIDGE_SPECIALS.includes(name)
  return {
    extraUnits: getDefaultUnitDefinitions(name, category),
    showExtraUnit: true,
    roomDays: defaults.room,
    fridgeDays: fridgeSuitable ? defaults.fridge : 0,
    frozenDays: defaults.frozen,
    fridgeSuitable
  }
}

const fromRemote = (config: RemoteIngredientConfig): IngredientConfig => ({
  extraUnits: withQualitativeUnit(config.extraUnits.map((unit) => ({
    unit: unit.unit,
    unitKey: unit.unitKey,
    ...(unit.baseUnit ? { baseUnit: unit.baseUnit } : {}),
    ...(unit.baseValue === undefined ? {} : { baseValue: Number(unit.baseValue) })
  }))),
  showExtraUnit: config.showExtraUnit,
  roomDays: config.roomDays,
  fridgeDays: config.fridgeDays,
  frozenDays: config.frozenDays,
  fridgeSuitable: config.fridgeSuitable
})

const toRemote = (name: string, category: string, config: IngredientConfig): RemoteIngredientConfig => ({
  ingredientKey: ingredientKeyFor(name),
  name,
  category: category || categoryFor(name),
  showExtraUnit: config.showExtraUnit,
  roomDays: config.roomDays,
  fridgeDays: config.fridgeDays,
  frozenDays: config.frozenDays,
  fridgeSuitable: config.fridgeSuitable,
  extraUnits: withQualitativeUnit(config.extraUnits).map((unit) => ({
    unit: unit.unit.trim(),
    unitKey: unit.unitKey || normalize(unit.unit),
    ...(unit.baseValue === undefined ? {} : { baseUnit: unit.baseUnit || 'g', baseValue: Number(unit.baseValue) })
  }))
})

export const loadIngredientConfigsRemote = async () => {
  if (!getAuthToken()) return []
  const configs = await getIngredientConfigsRemote()
  remoteConfigs.clear()
  remoteIngredientMeta.clear()
  configs.forEach((config) => {
    remoteConfigs.set(config.ingredientKey, fromRemote(config))
    remoteIngredientMeta.set(config.ingredientKey, { name: config.name, category: config.category })
  })
  return configs
}

export const saveIngredientConfig = async (name: string, config: IngredientConfig, category = '') => {
  const saved = await saveIngredientConfigRemote(ingredientKeyFor(name), toRemote(name, category, config))
  remoteConfigs.set(saved.ingredientKey, fromRemote(saved))
  remoteIngredientMeta.set(saved.ingredientKey, { name: saved.name, category: saved.category })
  return config
}

export const resetIngredientConfig = async (name: string) => {
  const key = ingredientKeyFor(name)
  await deleteIngredientConfigRemote(key)
  remoteConfigs.delete(key)
  remoteIngredientMeta.delete(key)
}

export const getConfiguredIngredientOptions = (): ConfiguredIngredientOption[] => [...remoteIngredientMeta.entries()]
  .map(([ingredientKey, meta]) => ({ ingredientKey, ...meta }))
  .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))

export const getIngredientConfig = (name: string, category = ''): IngredientConfig => {
  const custom = remoteConfigs.get(ingredientKeyFor(name))
  const defaults = getDefaultIngredientConfig(name, category)
  return custom ? { ...defaults, ...custom, extraUnits: withQualitativeUnit(custom.extraUnits || defaults.extraUnits) } : defaults
}

export const getIngredientUnit = (name: string, fallbackUnit = ''): string => {
  const config = getIngredientConfig(name)
  if (!config.showExtraUnit || !config.extraUnits.length) return 'g'
  return config.extraUnits[0]?.unit || fallbackUnit || 'g'
}

export const getIngredientUnitOptions = (name: string, currentUnit = ''): string[] => {
  const config = getIngredientConfig(name)
  const options = config.showExtraUnit ? config.extraUnits.map((item) => item.unit) : ['g']
  if (!options.length) options.push('g')
  if (currentUnit) options.push(currentUnit)
  return [...new Set(options.filter(Boolean))]
}
