export const FAMILY_CATEGORIES = [
  '快手早餐',
  '冷盘凉菜',
  '荤菜主菜',
  '素菜家常',
  '米面主食',
  '汤粥煲汤',
  '小吃点心',
  '饮品酒水'
] as const

export type FamilyCategory = typeof FAMILY_CATEGORIES[number]
export const DEFAULT_FAMILY_CATEGORY = '未分类'

const matches = (value: string, pattern: RegExp) => pattern.test(value)

export function classifyRecipe(input: { title: string; tags: string[]; ingredients: string[] }): FamilyCategory[] {
  const title = input.title || ''
  const tags = input.tags.join(' ')
  const ingredients = input.ingredients.join(' ')
  const text = `${title} ${ingredients}`
  const categories: FamilyCategory[] = []

  if (matches(`${tags} ${text}`, /早餐|早饭|三明治|鸡蛋灌饼|豆浆|油条/)) {
    categories.push('快手早餐')
  }
  if (matches(`${tags} ${title}`, /凉拌|冷盘|刺身|沙拉|泡菜|腌菜/)) {
    categories.push('冷盘凉菜')
  }
  if (matches(`${tags} ${text}`, /肉类|荤菜|禽类|猪肉|牛肉|羊肉|鸡肉|鸭肉|鱼|虾|蟹|海鲜|排骨|牛排|鸡翅|鸡腿|腊肉|香肠|培根|火腿|肉馅/)) {
    categories.push('荤菜主菜')
  }
  if (matches(`${tags} ${text}`, /素食|蔬菜|菌菇|菠菜|生菜|白菜|包菜|芹菜|韭菜|西兰花|番茄|茄子|黄瓜|冬瓜|南瓜|丝瓜|苦瓜|青椒|土豆|山药|萝卜|胡萝卜|莲藕|玉米|芋头|洋葱|蒜|豆角|蘑菇|香菇|金针菇|杏鲍菇|木耳|豆腐|豆干|豆皮|腐竹/)) {
    categories.push('素菜家常')
  }
  if (matches(`${tags} ${text}`, /主食|米饭|炒饭|盖浇饭|焖饭|面条|拉面|意大利面|粉丝|米粉|河粉|年糕|饺子|馄饨|包子|馒头|花卷|煎饼|烙饼|面饼/)) {
    categories.push('米面主食')
  }
  if (matches(`${tags} ${title}`, /汤羹|煲汤|汤|羹|粥|炖|糖水/)) {
    categories.push('汤粥煲汤')
  }
  if (matches(`${tags} ${text}`, /小吃|零食|炸|卤味|卤肉|糕点|蛋糕|面包|吐司|饼干|布丁|慕斯|蛋挞|月饼|冰淇淋|酥饼|马卡龙/)) {
    categories.push('小吃点心')
  }
  if (matches(tags, /饮品|果汁|茶|咖啡|酒/) || matches(`${title} ${ingredients}`, /饮品|饮料|果汁|茶饮|奶茶|咖啡|酒饮|果酒|酸梅汤/)) {
    categories.push('饮品酒水')
  }

  return [...new Set(categories)]
}
