import { RECIPE_PROCESSES } from '@/constants/recipes'
import { createAiResponseRemote, type AiResponseFormat } from '@/services/api'
import type { AIService, CookingAssistantInput, CookingAssistantResult, IngredientRecognition, RecipeDifficulty, RecipeProcess, RecipeRecommendation, RecipeRecommendationInput } from '@/types'
import { getCommunityRecipes } from '../../services/recipe'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const recipeDifficulties: RecipeDifficulty[] = ['简单', '中等', '进阶']

const jsonSchemaResponseFormat = (name: string, schema: Record<string, unknown>): AiResponseFormat => ({
  type: 'json_schema',
  json_schema: { name, strict: true, schema }
})

const recipeMetadataResponseFormat = (categories: string[]): AiResponseFormat => jsonSchemaResponseFormat('recipe_metadata', {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...categories, ''] },
    process: { type: 'string', enum: [...RECIPE_PROCESSES, ''] },
    flavor: { type: 'string' },
    difficulty: { type: 'string', enum: [...recipeDifficulties, ''] }
  },
  required: ['category', 'process', 'flavor', 'difficulty'],
  additionalProperties: false
})

const subtitleResponseFormat = jsonSchemaResponseFormat('recipe_subtitle', {
  type: 'object',
  properties: { subtitle: { type: 'string' } },
  required: ['subtitle'],
  additionalProperties: false
})

const stepResponseFormat = jsonSchemaResponseFormat('recipe_step_suggestion', {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    tip: { type: 'string' },
    duration: { type: 'integer', minimum: 0 }
  },
  required: ['title', 'description', 'tip', 'duration'],
  additionalProperties: false
})

const cookingAssistantResponseFormat = jsonSchemaResponseFormat('cooking_assistant', {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    suggestedStep: { type: ['integer', 'null'], minimum: 0 },
    shouldCompleteStep: { type: 'boolean' }
  },
  required: ['reply', 'suggestedStep', 'shouldCompleteStep'],
  additionalProperties: false
})

type AiGenerationOptions = {
  model?: string
  enableThinking?: boolean
  maxOutputTokens?: number
  topP?: number
  temperature?: number
  stop?: string | string[]
  thinkingBudget?: number
  responseFormat?: AiResponseFormat
}

export const runAiPrompt = async (input: string, options: AiGenerationOptions = {}) => {
  const response = await createAiResponseRemote({
    input,
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.enableThinking === undefined ? {} : { enableThinking: options.enableThinking }),
    ...(options.maxOutputTokens === undefined ? {} : { maxOutputTokens: options.maxOutputTokens }),
    ...(options.topP === undefined ? {} : { topP: options.topP }),
    ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    ...(options.stop === undefined ? {} : { stop: options.stop }),
    ...(options.thinkingBudget === undefined ? {} : { thinkingBudget: options.thinkingBudget }),
    ...(options.responseFormat === undefined ? {} : { responseFormat: options.responseFormat })
  })
  return response.text
}

const parseAiJson = (text: string): Record<string, unknown> => {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AI 返回的菜谱格式无效')
  const parsed: unknown = JSON.parse(normalized.slice(start, end + 1))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI 返回的菜谱格式无效')
  return parsed as Record<string, unknown>
}

const textValue = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const nonNegativeIntegerValue = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(number) && number >= 0 ? number : undefined
}

export interface RecipeMetadataSuggestion {
  category?: string
  process?: RecipeProcess
  flavor?: string
  difficulty?: RecipeDifficulty
}

export interface RecipeStepSuggestion {
  title: string
  description: string
  tip?: string
  duration?: number
}

export type RecipeStepAiMode = 'fill' | 'optimize'

const normalizeRecipeMetadata = (payload: Record<string, unknown>, categories: string[]): RecipeMetadataSuggestion => {
  const categoryValue = textValue(payload.category)
  const category = categories.includes(categoryValue) ? categoryValue : undefined
  const process = textValue(payload.process) as RecipeProcess
  const difficulty = textValue(payload.difficulty) as RecipeDifficulty
  return {
    ...(category ? { category } : {}),
    ...(RECIPE_PROCESSES.includes(process) ? { process } : {}),
    ...(textValue(payload.flavor) ? { flavor: textValue(payload.flavor).slice(0, 30) } : {}),
    ...(recipeDifficulties.includes(difficulty) ? { difficulty } : {})
  }
}

export const suggestRecipeMetadata = async (input: { title: string; categories: string[] }) => {
  const prompt = [
    '你是通用菜谱信息抽取助手。请只根据菜名的整体语义和常识，自主判断菜谱元数据。',
    '菜谱分类请独立判断，不要按关键词匹配，也不要套用任何预设的人工分类规则。',
    '只返回一个合法 JSON 对象，不要 Markdown 代码块，不要解释文字。',
    `process 必须是以下之一：${RECIPE_PROCESSES.join('、')}`,
    'difficulty 必须是：简单、中等、进阶。category 请从可用分类中选出最合适的一项，无法判断时返回空字符串。',
    'JSON 字段必须为：category、process、flavor、difficulty。',
    `可用分类：${input.categories.length ? input.categories.join('、') : '暂无，请返回空字符串'}`,
    `菜名：${input.title}`
  ].join('\n')
  return normalizeRecipeMetadata(parseAiJson(await runAiPrompt(prompt, { enableThinking: false, responseFormat: recipeMetadataResponseFormat(input.categories) })), input.categories)
}

export const suggestRecipeSubtitle = async (input: { title: string; flavor: string; process: string; difficulty: string }) => {
  const prompt = [
    '你是家常菜谱编辑助手，请为这道菜写一句简洁、自然、有食欲的一句话描述。',
    '只返回一个合法 JSON 对象，不要 Markdown 代码块，不要解释文字。描述不超过四十个中文字符，不要使用引号。',
    'JSON 字段必须为：subtitle。',
    `菜名：${input.title}`,
    `口味：${input.flavor || '未设置'}`,
    `制作工艺：${input.process || '未设置'}`,
    `难度：${input.difficulty || '未设置'}`
  ].join('\n')
  const payload = parseAiJson(await runAiPrompt(prompt, {model:'qwen3.7-flash', enableThinking: false, responseFormat: subtitleResponseFormat }))
  const subtitle = textValue(payload.subtitle).replace(/^['"“”]+|['"“”]+$/g, '').slice(0, 80)
  if (!subtitle) throw new Error('AI 未返回有效的一句话描述')
  return subtitle
}

export const suggestRecipeStep = async (input: {
  mode: RecipeStepAiMode
  title: string
  subtitle: string
  flavor: string
  process: string
  difficulty: string
  categories: string[]
  tags: string[]
  servings: string
  duration: string
  ingredients: Array<{ name: string; amount: string }>
  steps: Array<{ index: number; title: string; description: string; tip: string; duration?: number }>
  stepIndex: number
}): Promise<RecipeStepSuggestion> => {
  const prompt = [
    '你是可靠的中文家常菜谱编辑助手，请处理用户当前正在填写的一个步骤。',
    input.mode === 'optimize'
      ? '当前步骤已有正文，请在保留用户原意的基础上优化正文，使其更清晰、具体、可执行。'
      : '当前步骤没有正文，请根据菜谱上下文为当前步骤填写具体、可执行的正文。',
    '只生成目标步骤，不要生成其他步骤，不要生成或修改食材。只能使用用户已经填写的食材和菜谱信息。',
    '只返回一个合法 JSON 对象，不要 Markdown 代码块，不要解释文字。',
    'JSON 字段必须为：title、description、tip、duration。description 要具体可执行，duration 为分钟数，没有必要时返回 0。',
    `目标步骤序号：第 ${input.stepIndex + 1} 步（下标 ${input.stepIndex}）`,
    `菜谱上下文：${JSON.stringify({
      title: input.title,
      subtitle: input.subtitle,
      flavor: input.flavor,
      process: input.process,
      difficulty: input.difficulty,
      categories: input.categories,
      tags: input.tags,
      servings: input.servings,
      duration: input.duration,
      ingredients: input.ingredients,
      steps: input.steps
    })}`
  ].join('\n')
  const payload = parseAiJson(await runAiPrompt(prompt, { enableThinking: false, responseFormat: stepResponseFormat }))
  const description = textValue(payload.description)
  if (!description) throw new Error('AI 未返回有效的步骤建议')
  const duration = Number(payload.duration)
  return {
    title: textValue(payload.title) || `步骤 ${input.stepIndex + 1}`,
    description,
    ...(textValue(payload.tip) ? { tip: textValue(payload.tip) } : {}),
    ...(Number.isInteger(duration) && duration > 0 ? { duration } : {})
  }
}

const cookingAssistantSchema = (input: CookingAssistantInput) => JSON.stringify({
  recipe: {
    title: input.recipe.title,
    flavor: input.recipe.flavor,
    process: input.recipe.process,
    ingredients: input.recipe.ingredients.map((item) => ({ name: item.name, amount: item.amount.raw })),
    steps: input.recipe.steps.map((step, index) => ({ index, title: step.title, description: step.description, tip: step.tip }))
  },
  currentStep: input.currentStep,
  completedSteps: input.completedSteps,
  userMessage: input.message
})

const normalizeCookingAssistantResult = (text: string, stepCount: number): CookingAssistantResult => {
  const payload = parseAiJson(text)
  const reply = textValue(payload.reply)
  if (!reply) throw new Error('AI 返回的烹饪建议无效')
  const rawSuggestedStep = nonNegativeIntegerValue(payload.suggestedStep)
  const suggestedStep = rawSuggestedStep === undefined || !stepCount
    ? undefined
    : Math.min(stepCount - 1, rawSuggestedStep)
  return {
    reply,
    ...(suggestedStep === undefined ? {} : { suggestedStep }),
    ...(payload.shouldCompleteStep === true ? { shouldCompleteStep: true } : {})
  }
}

const mockAI: AIService = {
  async recognizeIngredients(_imageUrl: string) {
    await wait(700)
    return [
      { id: 'tomato', name: '番茄', amount: '约 2 个', confidence: 0.96 },
      { id: 'broccoli', name: '西兰花', amount: '约 300g', confidence: 0.9 },
      { id: 'garlic', name: '蒜', amount: '约 1 头', confidence: 0.82 }
    ]
  },
  async recommendRecipes(input: RecipeRecommendationInput) {
    await wait(500)
    const names = input.ingredients.map((item) => item.name)
    return getCommunityRecipes().map((recipe) => {
      const matched = recipe.ingredients.filter((ingredient) => names.includes(ingredient.name)).map((ingredient) => ingredient.name)
      const score = Math.min(98, Math.max(48, Math.round((matched.length / recipe.ingredients.length) * 100)))
      const missingIngredients = recipe.ingredients.filter((ingredient) => !names.includes(ingredient.name)).map((ingredient) => ingredient.name)
      return { recipe, score, reason: matched.length ? `已有 ${matched.join('、')}，食材匹配度很高` : '烹饪方式简单，适合现有食材灵活替换', missingIngredients } satisfies RecipeRecommendation
    }).sort((a, b) => b.score - a.score)
  },
  async chatCookingAssistant(input: CookingAssistantInput): Promise<CookingAssistantResult> {
    const prompt = [
      '你是一个可靠的中文家常菜烹饪助手。结合菜谱和用户进度回答问题。',
      '只返回一个合法 JSON 对象，不要 Markdown 代码块，不要解释文字。',
      'JSON 字段必须为 reply（简洁、可执行的中文建议）、suggestedStep（可选，步骤下标，从 0 开始）、shouldCompleteStep（可选布尔值）。',
      '只有用户明确表示当前步骤已经完成时才返回 shouldCompleteStep=true；不要擅自跳过步骤。',
      `当前上下文：${cookingAssistantSchema(input)}`
    ].join('\n')
    return normalizeCookingAssistantResult(await runAiPrompt(prompt, { enableThinking: false, responseFormat: cookingAssistantResponseFormat }), input.recipe.steps.length)
  }
}

export const recognizeIngredients = (imageUrl: string) => mockAI.recognizeIngredients(imageUrl)
export const recommendRecipes = (input: RecipeRecommendationInput) => mockAI.recommendRecipes(input)
export const chatCookingAssistant = (input: CookingAssistantInput) => mockAI.chatCookingAssistant(input)
export { mockAI }
