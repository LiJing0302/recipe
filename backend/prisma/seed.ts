import { PrismaClient } from '@prisma/client'
import { FAMILY_CATEGORIES } from '../src/recipes/category-classifier'
import { parseStoredIngredientAmount } from '../src/recipes/ingredient-amount'

const prisma = new PrismaClient()

const ingredient = (id: string, name: string, amount: string, unit: string) => ({
  id,
  name,
  amount: parseStoredIngredientAmount(amount, unit),
  optional: false,
  ingredientKey: `ingredient:${name}`,
  matchMethod: 'exact',
  confidence: 1
})

const debugIngredient = (id: string, name: string, amount: string, unit: string) => ({
  id,
  name,
  amount: parseStoredIngredientAmount(amount, unit),
  optional: false,
  ingredientKey: `ingredient:${name}`,
  matchMethod: 'manual',
  confidence: .4
})

const convertedIngredient = (id: string, name: string, amount: string, unit: string, perUnitValue: number, baseUnit: 'g' | 'ml' | 'count' = 'g') => {
  const parsed = parseStoredIngredientAmount(amount, unit)
  const value = parsed.value === undefined ? undefined : Number(parsed.value)
  return {
    id,
    name,
    amount: {
      ...parsed,
      ...(value === undefined ? {} : { baseValue: String(Number((value * perUnitValue).toFixed(6))), baseUnit, conversion: 'configured' as const }),
      sourceConversion: { unit, baseUnit, perUnitValue: String(perUnitValue) }
    },
    optional: false,
    ingredientKey: `ingredient:${name}`,
    matchMethod: 'exact',
    confidence: 1
  }
}

const step = (id: string, title: string, description: string, duration: number, tip?: string) => ({
  id,
  title,
  description,
  duration,
  tip: tip || null,
  images: []
})

const communityAuthors = [
  { id: 'community-demo-lin', name: '林小满', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80', bio: '把家常菜做得刚刚好。' },
  { id: 'community-demo-chen', name: '陈叔厨房', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80', bio: '一口热饭，三两家常。' },
  { id: 'community-demo-yu', name: '小鱼的厨房', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&q=80', bio: '下班后也要好好吃饭。' }
]

const communityRecipes = [
  {
    id: 'community-demo-tomato-beef',
    authorId: 'community-demo-lin',
    title: '番茄牛腩煲',
    subtitle: '酸甜浓郁的汤汁裹住软烂牛腩，拌饭刚刚好。',
    cover: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=85',
    categories: ['荤菜主菜'],
    tags: ['家常菜', '下饭菜'],
    flavor: '酸甜',
    servings: 3,
    duration: 70,
    difficulty: '中等',
    rating: 4.8,
    ratingCount: 128,
    cookingCount: 320,
    skillLevel: 2,
    ingredients: [
      ingredient('tomato-beef-1', '牛腩', '500g', 'g'),
      ingredient('tomato-beef-2', '番茄', '3个', '个'),
      ingredient('tomato-beef-3', '洋葱', '1个', '个'),
      ingredient('tomato-beef-4', '生姜', '5块', '块'),
      ingredient('tomato-beef-5', '大葱', '1根', '根'),
      ingredient('tomato-beef-6', '生抽', '2勺', '瓶'),
      ingredient('tomato-beef-7', '料酒', '1勺', '瓶'),
      ingredient('tomato-beef-8', '冰糖', '10g', '份')
    ],
    steps: [
      step('tomato-beef-step-1', '牛腩焯水', '牛腩切成大块，冷水下锅，加入姜片和料酒，煮出浮沫后捞出洗净。', 12, '冷水下锅能更好地去除腥味。'),
      step('tomato-beef-step-2', '炒出底香', '锅中放少量油，加入冰糖炒至融化，再放入牛腩翻炒上色，加入洋葱和大葱炒香。', 8),
      step('tomato-beef-step-3', '小火焖煮', '加入生抽和足量热水，大火烧开后转小火，加盖焖煮约 45 分钟。', 45, '中途需要补水时请加热水，避免肉质变柴。'),
      step('tomato-beef-step-4', '加入番茄', '放入切块番茄，再焖煮 10 分钟至汤汁浓稠，尝味后即可出锅。', 10)
    ]
  },
  {
    id: 'community-demo-broccoli',
    authorId: 'community-demo-chen',
    title: '蒜香西兰花',
    subtitle: '五分钟焯炒，清爽脆嫩又下饭。',
    cover: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=900&q=85',
    categories: ['素菜家常'],
    tags: ['快手菜', '低脂'],
    flavor: '咸鲜',
    servings: 2,
    duration: 15,
    difficulty: '简单',
    rating: 4.7,
    ratingCount: 96,
    cookingCount: 248,
    skillLevel: 1,
    ingredients: [
      ingredient('broccoli-1', '西兰花', '1颗', '颗'),
      ingredient('broccoli-2', '大蒜', '1头', '头'),
      ingredient('broccoli-3', '食用油', '1勺', '桶'),
      ingredient('broccoli-4', '盐', '半勺', '瓶'),
      ingredient('broccoli-5', '蚝油', '1勺', '瓶')
    ],
    steps: [
      step('broccoli-step-1', '处理西兰花', '西兰花剪成小朵，用淡盐水浸泡 5 分钟后冲洗干净。', 5),
      step('broccoli-step-2', '快速焯水', '锅中水沸腾后加入少许盐和油，放入西兰花焯 60 秒，捞出沥干。', 2, '焯水时间不要过长，保留脆嫩口感。'),
      step('broccoli-step-3', '爆香蒜末', '大蒜切末，热锅放油，加入蒜末小火炒至微微金黄。', 3),
      step('broccoli-step-4', '翻炒调味', '倒入西兰花，加入蚝油和盐，大火翻炒 1 分钟后关火装盘。', 2)
    ]
  },
  {
    id: 'community-demo-chicken-rice',
    authorId: 'community-demo-yu',
    title: '香菇鸡腿焖饭',
    subtitle: '一锅完成的下班晚餐，米饭吸满鸡汁特别香。',
    cover: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=900&q=85',
    categories: ['米面主食'],
    tags: ['一锅端', '晚餐'],
    flavor: '咸鲜',
    servings: 2,
    duration: 45,
    difficulty: '简单',
    rating: 4.9,
    ratingCount: 154,
    cookingCount: 410,
    skillLevel: 1,
    ingredients: [
      ingredient('chicken-rice-1', '鸡腿', '2个', '个'),
      ingredient('chicken-rice-2', '香菇', '6朵', '朵'),
      ingredient('chicken-rice-3', '大米', '2份', '份'),
      ingredient('chicken-rice-4', '胡萝卜', '半根', '根'),
      ingredient('chicken-rice-5', '洋葱', '半个', '个'),
      ingredient('chicken-rice-6', '生抽', '2勺', '瓶'),
      ingredient('chicken-rice-7', '老抽', '半勺', '瓶')
    ],
    steps: [
      step('chicken-rice-step-1', '腌制鸡腿', '鸡腿去骨切块，加入生抽、老抽腌制 10 分钟；香菇泡发后切片。', 10),
      step('chicken-rice-step-2', '炒香配料', '锅中放少量油，先炒鸡腿至表面变色，再加入洋葱、胡萝卜和香菇翻炒。', 8),
      step('chicken-rice-step-3', '加入米和水', '大米洗净放入电饭煲，倒入炒好的鸡腿和配料，加入与平时煮饭相同的水量。', 5, '香菇泡发水过滤后加入，香味更足。'),
      step('chicken-rice-step-4', '焖熟拌匀', '启动煮饭程序，完成后继续焖 10 分钟，打开后翻拌均匀即可。', 22)
    ]
  },
  {
    id: 'community-demo-pumpkin-millet',
    authorId: 'community-demo-lin',
    title: '南瓜小米粥',
    subtitle: '南瓜的自然甜味融进小米里，早餐暖胃又省心。',
    cover: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=900&q=85',
    categories: ['汤粥煲汤'],
    tags: ['早餐', '养胃'],
    flavor: '清淡',
    servings: 3,
    duration: 35,
    difficulty: '简单',
    rating: 4.6,
    ratingCount: 83,
    cookingCount: 176,
    skillLevel: 1,
    ingredients: [
      ingredient('pumpkin-millet-1', '南瓜', '300g', '个'),
      ingredient('pumpkin-millet-2', '小米', '100g', '份'),
      ingredient('pumpkin-millet-3', '冰糖', '20g', '份')
    ],
    steps: [
      step('pumpkin-millet-step-1', '处理南瓜', '南瓜去皮去籽，切成小块；小米淘洗两遍后浸泡 10 分钟。', 10),
      step('pumpkin-millet-step-2', '煮小米', '锅中加入约 1.5 升清水，水开后放入小米，保持中小火煮 15 分钟。', 15),
      step('pumpkin-millet-step-3', '加入南瓜', '放入南瓜块继续煮 8 分钟，期间偶尔搅拌避免粘底。', 8),
      step('pumpkin-millet-step-4', '调整甜度', '南瓜煮软后加入冰糖，搅拌至融化，关火焖 2 分钟即可。', 2)
    ]
  },
  {
    id: 'community-debug-unknown-ingredients',
    authorId: 'community-demo-yu',
    title: '测试·完全陌生食材映射',
    subtitle: '用于测试用户食材库没有对应食材时的导入确认流程。',
    cover: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900&q=85',
    categories: ['荤菜主菜'],
    tags: ['测试数据', '食材映射'],
    flavor: '酸辣',
    servings: 2,
    duration: 35,
    difficulty: '中等',
    rating: 0,
    ratingCount: 0,
    cookingCount: 0,
    skillLevel: 2,
    ingredients: [
      ingredient('debug-unknown-1', '鸡腿', '2个', '个'),
      debugIngredient('debug-unknown-2', '香茅', '2根', '根'),
      debugIngredient('debug-unknown-3', '椰浆', '200ml', 'ml'),
      ingredient('debug-unknown-4', '生抽', '1勺', '勺'),
      debugIngredient('debug-unknown-5', '青柠叶', '4片', '片')
    ],
    steps: [
      step('debug-unknown-step-1', '准备食材', '鸡腿切块，香茅拍松切段，青柠叶撕开备用。', 8),
      step('debug-unknown-step-2', '煎香鸡腿', '锅中少油，将鸡腿煎至表面金黄，加入香茅炒出香味。', 10),
      step('debug-unknown-step-3', '加入椰浆', '倒入椰浆和生抽，小火煮至鸡腿熟透，最后加入青柠叶。', 15, '这道测试食谱中的香茅、椰浆和青柠叶用于测试陌生食材处理。')
    ]
  },
  {
    id: 'community-debug-missing-units',
    authorId: 'community-demo-chen',
    title: '测试·已有食材但单位缺失',
    subtitle: '用于测试生抽、老抽存在，但用户额外单位中没有勺的场景。',
    cover: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=85',
    categories: ['素菜家常'],
    tags: ['测试数据', '单位映射'],
    flavor: '咸鲜',
    servings: 2,
    duration: 25,
    difficulty: '简单',
    rating: 0,
    ratingCount: 0,
    cookingCount: 0,
    skillLevel: 1,
    ingredients: [
      ingredient('debug-unit-1', '豆腐', '300g', 'g'),
      convertedIngredient('debug-unit-2', '生抽', '2勺', '勺', 5),
      convertedIngredient('debug-unit-3', '老抽', '半勺', '勺', 5),
      ingredient('debug-unit-4', '大蒜', '4瓣', '瓣'),
      debugIngredient('debug-unit-5', '香葱酥', '1把', '把')
    ],
    steps: [
      step('debug-unit-step-1', '煎豆腐', '豆腐切厚片，擦干表面水分后煎至两面金黄。', 10),
      step('debug-unit-step-2', '调味焖煮', '加入生抽、老抽和半碗清水，盖盖焖煮 8 分钟。', 8),
      step('debug-unit-step-3', '装盘', '大火收汁，撒上香葱酥即可。', 5, '生抽和老抽故意使用“勺”，用于测试当前用户没有该额外单位时的处理。')
    ]
  },
  {
    id: 'community-debug-alias-mixed',
    authorId: 'community-demo-lin',
    title: '测试·别名与陌生食材混合',
    subtitle: '用于测试酱油、芝麻油等别名自动匹配，以及陌生调味料人工处理。',
    cover: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=85',
    categories: ['米面主食'],
    tags: ['测试数据', '别名匹配'],
    flavor: '香辣',
    servings: 2,
    duration: 20,
    difficulty: '简单',
    rating: 0,
    ratingCount: 0,
    cookingCount: 0,
    skillLevel: 1,
    ingredients: [
      ingredient('debug-alias-1', '面条', '2份', '份'),
      ingredient('debug-alias-2', '酱油', '1勺', '勺'),
      ingredient('debug-alias-3', '芝麻油', '半勺', '勺'),
      debugIngredient('debug-alias-4', '烟熏辣椒粉', '半勺', '勺'),
      debugIngredient('debug-alias-5', '香茅', '1根', '根')
    ],
    steps: [
      step('debug-alias-step-1', '煮面', '面条煮熟后捞出，保留少量面汤。', 8),
      step('debug-alias-step-2', '调拌料汁', '碗中加入酱油、芝麻油和烟熏辣椒粉，加入一勺面汤调匀。', 4),
      step('debug-alias-step-3', '拌面', '面条加入料汁拌匀，放上拍松的香茅提香后即可食用。', 8, '酱油和芝麻油用于测试别名自动匹配，烟熏辣椒粉和香茅用于测试人工处理。')
    ]
  }
]

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'me' },
    update: {},
    create: {
      id: 'me',
      name: '林小满',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
      bio: '把每天的一餐，做成值得记住的事。',
      cookingDays: 18,
      totalCooking: 36,
      favoriteCount: 12
    }
  })

  await prisma.recipeCategory.createMany({
    data: FAMILY_CATEGORIES.map((name, position) => ({ name, position, isDefault: true, userId: user.id })),
    skipDuplicates: true
  })

  for (const author of communityAuthors) {
    await prisma.user.upsert({
      where: { id: author.id },
      update: { name: author.name, avatar: author.avatar, bio: author.bio },
      create: { id: author.id, name: author.name, avatar: author.avatar, bio: author.bio }
    })
    await prisma.recipeCategory.createMany({
      data: FAMILY_CATEGORIES.map((name, position) => ({ name, position, isDefault: true, userId: author.id })),
      skipDuplicates: true
    })
  }

  for (const recipe of communityRecipes) {
    await prisma.recipe.upsert({
      where: { id: recipe.id },
      update: recipe,
      create: { ...recipe, isPublic: true, source: 'user' }
    })
  }

  console.log(`Seeded user ${user.id} and ${communityRecipes.length} community recipes`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
