<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import StepChecklist from '@/components/StepChecklist.vue'
import { chatCookingAssistant } from '@/pages-sub/services/ai'
import { completeCooking } from '@/services/cooking'
import { fetchRecipe, getRecipeDetail } from '@/services/recipe'
import type { CookingAssistantResult, Recipe } from '@/types'

const recipe = ref<Recipe>()
const currentStep = ref(0)
const completedSteps = ref<number[]>([])
const messages = ref<{ role: 'assistant' | 'user'; text: string }[]>([])
const input = ref('')
const sending = ref(false)
const showFinish = ref(false)
const rating = ref(5)
const comment = ref('')
const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

onLoad(async (options) => {
  recipe.value = options?.id ? getRecipeDetail(options.id) : undefined
  if (!recipe.value && options?.id) {
    try {
      recipe.value = await fetchRecipe(options.id)
    } catch {
      recipe.value = undefined
    }
  }
  if (recipe.value) { messages.value = [{ role: 'assistant', text: `今天做「${recipe.value.title}」。我会陪你一步一步完成，先从「${recipe.value.steps[0].title}」开始。` }]; timer = setInterval(() => elapsed.value += 1, 60000) }
})
const current = computed(() => recipe.value?.steps[currentStep.value])
const progress = computed(() => recipe.value ? Math.round((completedSteps.value.length / recipe.value.steps.length) * 100) : 0)
const selectStep = (index: number) => { currentStep.value = index }
const completeCurrent = () => { if (!completedSteps.value.includes(currentStep.value)) completedSteps.value.push(currentStep.value); if (recipe.value && currentStep.value < recipe.value.steps.length - 1) currentStep.value += 1; else showFinish.value = true }
const send = async (preset?: string) => {
  if (!recipe.value || sending.value) return
  const text = (preset || input.value).trim()
  if (!text) return
  input.value = ''; messages.value.push({ role: 'user', text }); sending.value = true
  const result: CookingAssistantResult = await chatCookingAssistant({ recipe: recipe.value, currentStep: currentStep.value, completedSteps: completedSteps.value, message: text })
  messages.value.push({ role: 'assistant', text: result.reply }); if (typeof result.suggestedStep === 'number') currentStep.value = result.suggestedStep; if (result.shouldCompleteStep) completeCurrent(); sending.value = false
}
const finish = async () => { if (!recipe.value) return; try { await completeCooking({ recipeId: recipe.value.id, date: new Date().toISOString().slice(0, 10), duration: Math.max(1, elapsed.value), rating: rating.value, comment: comment.value || '按食谱完成了一次烹饪。' }); showFinish.value = false; uni.showToast({ title: '烹饪记录已保存', icon: 'success' }); setTimeout(() => uni.navigateBack(), 600) } catch { uni.showToast({ title: '记录保存失败，请检查服务连接', icon: 'none' }) } }
</script>

<template>
  <view v-if="recipe" class="cook-page page-shell"><view class="cook-header"><view><text class="eyebrow">COOKING MODE</text><text class="cook-title">{{ recipe.title }}</text></view><text class="voice-button" @click="uni.showToast({ title: '语音入口将在下一版接入', icon: 'none' })">语音</text></view><view class="progress-block"><view class="progress-label"><text>完成进度</text><text>{{ progress }}%</text></view><view class="progress-track"><view class="progress-value" :style="{ width: `${progress}%` }" /></view></view><view class="current-step surface"><view class="step-label">正在进行 · 第 {{ currentStep + 1 }} 步</view><text class="current-title">{{ current?.title }}</text><text class="current-description">{{ current?.description }}</text><text v-if="current?.tip" class="current-tip">注意：{{ current.tip }}</text><button class="primary-button step-button" @click="completeCurrent">{{ currentStep === recipe.steps.length - 1 ? '完成烹饪' : '完成这一步' }}</button></view><view class="all-steps"><view class="section-row"><text class="section-title">步骤清单</text><text class="caption">点击可跳转</text></view><StepChecklist :steps="recipe.steps" :current="currentStep" :completed="completedSteps" @select="selectStep" /></view><view class="assistant surface"><view class="assistant-head"><view><text class="assistant-title">AI 烹饪助手</text><text class="assistant-subtitle">告诉我你做到哪了</text></view><text class="ai-badge">AI</text></view><scroll-view scroll-y class="chat-list"><view v-for="(message, index) in messages" :key="index" class="message" :class="message.role"><text>{{ message.text }}</text></view><view v-if="sending" class="message assistant"><text>正在想...</text></view></scroll-view><view class="quick-prompts"><text @click="send('我已经完成这一步了')">我做好了</text><text @click="send('下一步是什么？')">下一步</text><text @click="send('火候应该怎么调？')">问火候</text></view><view class="chat-input"><input v-model="input" placeholder="和 AI 说说你的进度" confirm-type="send" @confirm="send()" /><text @click="send()">发送</text></view></view><view v-if="showFinish" class="modal-mask"><view class="finish-modal"><text class="modal-title">这顿饭完成了</text><text class="modal-desc">留下今天的味道，成为你的烹饪记录</text><view class="stars"><text v-for="item in 5" :key="item" :class="{ active: item <= rating }" @click="rating = item">★</text></view><textarea v-model="comment" placeholder="今天做得怎么样？" maxlength="100" /><button class="primary-button" @click="finish">保存烹饪记录</button></view></view></view><view v-else class="empty-state">食谱加载中…</view>
</template>

<style scoped>
.cook-page { padding-top: 42rpx; padding-bottom: 60rpx; }
.cook-header { display: flex; align-items: flex-end; justify-content: space-between; }
.eyebrow { color: #8b948b; font-size: 20rpx; letter-spacing: 2rpx; }
.cook-title { display: block; margin-top: 14rpx; color: #33261e; font-size: 42rpx; font-weight: 700; }
.voice-button { padding: 12rpx 20rpx; border-radius: 999rpx; background: #e5eee5; color: #c93d20; font-size: 23rpx; }
.progress-block { margin-top: 34rpx; }
.progress-label { display: flex; justify-content: space-between; color: #69776e; font-size: 22rpx; }
.progress-label text:last-child { color: #c93d20; font-weight: 700; }
.progress-track { height: 10rpx; margin-top: 12rpx; overflow: hidden; border-radius: 999rpx; background: #e2e9e1; }
.progress-value { height: 100%; border-radius: inherit; background: #c93d20; transition: width .2s ease; }
.current-step { margin-top: 28rpx; padding: 28rpx; }
.step-label { color: #b27835; font-size: 22rpx; font-weight: 600; }
.current-title { display: block; margin-top: 16rpx; color: #33261e; font-size: 36rpx; font-weight: 700; }
.current-description { display: block; margin-top: 12rpx; color: #66736a; font-size: 26rpx; line-height: 1.6; }
.current-tip { display: block; margin-top: 14rpx; color: #9b6a2c; font-size: 23rpx; line-height: 1.5; }
.step-button { margin-top: 24rpx; }
.all-steps { margin-top: 42rpx; }
.all-steps .steps { margin-top: 16rpx; }
.assistant { margin-top: 42rpx; padding: 26rpx; }
.assistant-head { display: flex; align-items: center; justify-content: space-between; }
.assistant-title { display: block; color: #c93d20; font-size: 30rpx; font-weight: 700; }
.assistant-subtitle { display: block; margin-top: 7rpx; color: #a29388; font-size: 21rpx; }
.ai-badge { display: flex; align-items: center; justify-content: center; width: 54rpx; height: 54rpx; border-radius: 16rpx; background: #e4eee3; color: #c93d20; font-size: 20rpx; font-weight: 800; }
.chat-list { height: 300rpx; margin-top: 20rpx; padding: 4rpx; }
.message { display: flex; margin: 14rpx 0; }
.message text { max-width: 82%; padding: 16rpx 18rpx; border-radius: 16rpx; color: #34473f; font-size: 23rpx; line-height: 1.5; }
.message.assistant text { background: #eef4ec; }
.message.user { justify-content: flex-end; }
.message.user text { background: #c93d20; color: #fff; }
.quick-prompts { display: flex; gap: 12rpx; overflow: hidden; white-space: nowrap; }
.quick-prompts text { padding: 9rpx 14rpx; border: 1rpx solid #dce7dc; border-radius: 999rpx; color: #c93d20; font-size: 21rpx; }
.chat-input { display: flex; align-items: center; gap: 14rpx; margin-top: 18rpx; padding: 0 18rpx; border-radius: 14rpx; background: #f3f6f0; }
.chat-input input { flex: 1; height: 70rpx; color: #34473f; font-size: 23rpx; line-height: 70rpx; }
.chat-input text { color: #c93d20; font-size: 23rpx; }
.modal-mask { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 32rpx; background: rgba(23,34,30,.35); }
.finish-modal { width: 100%; padding: 34rpx 28rpx; border-radius: 24rpx; background: #fff; }
.modal-title { display: block; color: #33261e; font-size: 38rpx; font-weight: 700; }
.modal-desc { display: block; margin-top: 10rpx; color: #a29388; font-size: 23rpx; }
.stars { display: flex; justify-content: center; gap: 20rpx; margin: 32rpx 0; }
.stars text { color: #dce3db; font-size: 58rpx; }
.stars text.active { color: #e5a34e; }
.finish-modal textarea { width: 100%; height: 140rpx; padding: 18rpx; border-radius: 14rpx; background: #f3f6f0; color: #34473f; font-size: 24rpx; }
.finish-modal button { margin-top: 24rpx; }
</style>
