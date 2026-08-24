<script setup lang="ts">
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { ref } from 'vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { getPublicRecipesRemote } from '@/services/api'
import { isCollected, loadCollections, toggleCollection } from '@/services/recipe'
import type { Recipe } from '@/types'

const tag = ref('')
const recipes = ref<Recipe[]>([])
const total = ref(0)
const page = ref(1)
const hasMore = ref(true)
const loading = ref(false)
const error = ref('')
const collected = ref<Record<string, boolean>>({})

const load = async (reset = false) => {
  if (loading.value || (!reset && !hasMore.value)) return
  if (reset) {
    page.value = 1
    hasMore.value = true
    recipes.value = []
  }
  loading.value = true
  error.value = ''
  try {
    await loadCollections()
    const result = await getPublicRecipesRemote(tag.value, page.value, 10)
    recipes.value = [...recipes.value, ...result.items]
    total.value = result.total
    hasMore.value = result.hasMore
    page.value = result.page + 1
    collected.value = Object.fromEntries(recipes.value.map((recipe) => [recipe.id, isCollected(recipe.id)]))
  } catch (reason) {
    console.error('[category-recipes] load failed', reason)
    if (!recipes.value.length) error.value = '菜谱加载失败，请检查服务连接'
  } finally {
    loading.value = false
  }
}

const decodeTag = (value: unknown) => {
  const text = String(value || '')
  try { return decodeURIComponent(text) } catch { return text }
}

const openRecipe = (id: string) => uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` })
const collect = async (id: string) => {
  try { collected.value[id] = await toggleCollection(id) } catch { uni.showToast({ title: '收藏操作失败，请检查服务连接', icon: 'none' }); return }
  uni.showToast({ title: collected.value[id] ? '已加入我的食谱' : '已取消收藏', icon: 'none' })
}

onLoad((options) => {
  tag.value = decodeTag(options?.tag)
  uni.setNavigationBarTitle({ title: tag.value || '全部菜谱' })
  load(true)
})
onReachBottom(() => load())
</script>

<template>
  <view class="page-shell recipe-list-page">
    <view class="list-header"><view><text class="eyebrow">CATEGORY</text><text class="page-title">{{ tag || '全部菜谱' }}</text></view><text class="total-count">{{ total }} 道菜</text></view>
    <view v-if="error && !recipes.length" class="empty-state"><text>{{ error }}</text><text class="retry" @click="load(true)">重新加载</text></view>
    <view v-else-if="!loading && !recipes.length" class="empty-state">这个分类暂时没有菜谱</view>
    <view v-else class="feed">
      <RecipeCard v-for="recipe in recipes" :key="recipe.id" :recipe="recipe" :collected="collected[recipe.id]" @open="openRecipe" @toggle-collect="collect" />
      <view v-if="loading" class="list-status">正在加载...</view>
      <view v-else-if="hasMore" class="list-status">上拉加载更多</view>
      <view v-else class="list-status">已经到底了</view>
    </view>
  </view>
</template>

<style scoped>
.recipe-list-page { padding-top: 42rpx; padding-bottom: 50rpx; }
.list-header { display: flex; align-items: flex-end; justify-content: space-between; padding: 14rpx 0 28rpx; }
.eyebrow { color: #8b948b; font-size: 20rpx; letter-spacing: 2rpx; }
.page-title { display: block; max-width: 520rpx; margin-top: 16rpx; color: #33261e; font-size: 48rpx; font-weight: 700; }
.total-count { flex-shrink: 0; margin-bottom: 8rpx; color: #a29388; font-size: 22rpx; }
.feed { display: flex; flex-direction: column; gap: 22rpx; }
.list-status { padding: 14rpx 0 4rpx; color: #a29388; text-align: center; font-size: 22rpx; }
.retry { display: block; margin-top: 18rpx; color: #c93d20; font-size: 23rpx; }
</style>
