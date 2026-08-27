/** 系统维护的制作工艺，供食谱创建和后续筛选使用。 */
export const RECIPE_PROCESSES = [
  '炒', '煎', '炸', '蒸', '煮', '炖', '焖', '烤', '卤', '拌', '腌', '烘焙', '免烹饪', '其他'
] as const

export type RecipeProcess = (typeof RECIPE_PROCESSES)[number]
