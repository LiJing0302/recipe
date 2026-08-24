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
export const UNCATEGORIZED_CATEGORY = '未分类'
export const DEFAULT_FAMILY_CATEGORY = UNCATEGORIZED_CATEGORY
