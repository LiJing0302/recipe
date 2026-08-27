import type { AIService, CookingAssistantInput, CookingAssistantResult, IngredientRecognition, RecipeRecommendation, RecipeRecommendationInput } from '@/types'
import { getCommunityRecipes } from '../../services/recipe'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
    await wait(450)
    const text = input.message.trim()
    if (!text) return { reply: `现在正在做「${input.recipe.title}」。你可以告诉我完成了哪一步，或者问我下一步。` }
    if (/下一步|接下来|然后/.test(text)) {
      const next = Math.min(input.recipe.steps.length - 1, input.currentStep + 1)
      return { reply: `下一步是「${input.recipe.steps[next].title}」：${input.recipe.steps[next].description}`, suggestedStep: next }
    }
    if (/完成|好了|做完|切好|准备好/.test(text)) {
      return { reply: '收到，我已经记下你的进度。注意观察颜色和质地，准备好后告诉我继续。', shouldCompleteStep: true }
    }
    if (/火|温度|锅/.test(text)) return { reply: '保持中火即可。锅太热时先离火几秒，避免食材表面焦了但内部还没熟。' }
    return { reply: '明白了。按照当前步骤继续即可，如果食材开始变色或出汁，及时告诉我，我会帮你判断下一步。' }
  }
}

export const recognizeIngredients = (imageUrl: string) => mockAI.recognizeIngredients(imageUrl)
export const recommendRecipes = (input: RecipeRecommendationInput) => mockAI.recommendRecipes(input)
export const chatCookingAssistant = (input: CookingAssistantInput) => mockAI.chatCookingAssistant(input)
export { mockAI }
