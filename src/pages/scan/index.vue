<script setup lang="ts">
import { ref } from 'vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { recognizeIngredients, recommendRecipes } from '@/services/ai'
import type { IngredientRecognition, Recipe, RecipeRecommendation } from '@/types'

const imageUrl = ref('')
const loading = ref(false)
const ingredients = ref<IngredientRecognition[]>([])
const recommendations = ref<RecipeRecommendation[]>([])
const chooseImage = () => {
  uni.chooseImage({ count: 1, sourceType: ['album', 'camera'], success: async (result) => { imageUrl.value = result.tempFilePaths[0]; await recognize() } })
}
const recognize = async () => { loading.value = true; ingredients.value = await recognizeIngredients(imageUrl.value); recommendations.value = await recommendRecipes({ ingredients: ingredients.value }); loading.value = false }
const updateAmount = (item: IngredientRecognition, event: any) => { item.amount = event.detail?.value || '' }
</script>

<template>
  <view class="page-shell scan-page"><view class="page-intro"><text class="eyebrow">INGREDIENT SCANNER</text><text class="page-title">识别我的食材</text><text class="page-desc">拍一张冰箱或菜篮子的照片，AI 帮你找出今天能做的菜</text></view><view class="scan-box" :class="{ filled: imageUrl }" @click="chooseImage"><image v-if="imageUrl" :src="imageUrl" mode="aspectFill" /><view v-else class="scan-placeholder"><text class="scan-mark">+</text><text>拍照或从相册选择</text><text class="caption">支持常见蔬菜、肉类和调味料</text></view><view v-if="imageUrl" class="retake">重新识别</view></view><view v-if="loading" class="loading surface">AI 正在看一看你的食材...</view><view v-if="ingredients.length && !loading" class="result-section"><view class="section-row"><text class="section-title">识别结果</text><text class="caption">可修改分量</text></view><view class="ingredients surface"><view v-for="item in ingredients" :key="item.id" class="ingredient-row"><view class="ingredient-name"><text>{{ item.name }}</text><text class="confidence">{{ Math.round(item.confidence * 100) }}% 匹配</text></view><input :value="item.amount" @input="updateAmount(item, $event)" /></view></view><view class="section-row recommend-head"><text class="section-title">适合做这些</text><text class="caption">按相关程度排序</text></view><view class="recommend-list"><view v-for="item in recommendations" :key="item.recipe.id" class="recommend-item surface" @click="uni.navigateTo({ url: `/pages/recipe/detail?id=${item.recipe.id}` })"><image :src="item.recipe.cover" mode="aspectFill" /><view class="recommend-copy"><view class="recommend-title-row"><text class="recommend-title">{{ item.recipe.title }}</text><text class="score">{{ item.score }}%</text></view><text class="reason">{{ item.reason }}</text><text v-if="item.missingIngredients.length" class="missing">还缺：{{ item.missingIngredients.join('、') }}</text></view></view></view></view></view>
</template>

<style scoped>
.scan-page { padding-top: 42rpx; }
.page-intro { padding: 14rpx 0 30rpx; }
.eyebrow { color: #8b948b; font-size: 20rpx; letter-spacing: 2rpx; }
.page-title { display: block; margin-top: 16rpx; color: #33261e; font-size: 48rpx; font-weight: 700; }
.page-desc { display: block; margin-top: 12rpx; color: #a29388; font-size: 24rpx; line-height: 1.55; }
.scan-box { position: relative; display: flex; align-items: center; justify-content: center; height: 410rpx; overflow: hidden; border: 2rpx dashed #a8c2ad; border-radius: 24rpx; background: #eaf2e8; }
.scan-box.filled { border: 0; }
.scan-box image { width: 100%; height: 100%; }
.scan-placeholder { display: flex; flex-direction: column; align-items: center; gap: 14rpx; color: #c93d20; font-size: 27rpx; }
.scan-mark { display: flex; align-items: center; justify-content: center; width: 90rpx; height: 90rpx; border-radius: 50%; background: #d5e7d7; color: #c93d20; font-size: 48rpx; }
.retake { position: absolute; right: 22rpx; bottom: 20rpx; padding: 10rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.86); color: #c93d20; font-size: 22rpx; }
.loading { margin-top: 20rpx; padding: 28rpx; color: #c93d20; text-align: center; }
.result-section { margin-top: 36rpx; }
.ingredients { margin-top: 18rpx; padding: 0 22rpx; }
.ingredient-row { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid #f5e9dd; }
.ingredient-row:last-child { border-bottom: 0; }
.ingredient-name text { display: block; }
.ingredient-name text:first-child { color: #34473f; font-size: 27rpx; font-weight: 600; }
.confidence { margin-top: 6rpx; color: #a29388; font-size: 20rpx; }
.ingredient-row input { width: 190rpx; height: 58rpx; padding: 0 14rpx; border-radius: 10rpx; background: #f3f6f0; color: #5d786c; text-align: right; font-size: 23rpx; line-height: 58rpx; }
.recommend-head { margin-top: 42rpx; }
.recommend-list { display: flex; flex-direction: column; gap: 16rpx; margin-top: 18rpx; }
.recommend-item { display: flex; gap: 18rpx; padding: 16rpx; }
.recommend-item image { flex: 0 0 150rpx; width: 150rpx; height: 150rpx; border-radius: 14rpx; }
.recommend-copy { flex: 1; min-width: 0; padding-top: 4rpx; }
.recommend-title-row { display: flex; justify-content: space-between; gap: 12rpx; }
.recommend-title { color: #34473f; font-size: 27rpx; font-weight: 700; }
.score { color: #c58235; font-size: 22rpx; font-weight: 700; }
.reason, .missing { display: block; margin-top: 12rpx; color: #6d7a71; font-size: 22rpx; line-height: 1.45; }
.missing { color: #a3753c; }
</style>
