<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CategorySplit from '@/components/CategorySplit.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { DEFAULT_FAMILY_CATEGORY, FAMILY_CATEGORIES } from '@/constants/recipe'
import { fetchMyRecipes, isCollected } from '@/services/recipe'
import { getCurrentUser } from '@/services/storage'
import type { Recipe, RecipeCategory } from '@/types'

const user = getCurrentUser()
const allRecipes = ref<Recipe[]>([])
const activeCategory = ref('')
const categoryLoading = ref(false)
const error = ref('')

const categoriesFor = (recipe: Recipe) => {
  const categories = recipe.categories?.filter((category) => FAMILY_CATEGORIES.includes(category)) || []
  return categories.length ? categories : [DEFAULT_FAMILY_CATEGORY]
}
const categories = computed<RecipeCategory[]>(() => {
  const counts = Object.fromEntries(FAMILY_CATEGORIES.map((category) => [category, 0])) as Record<string, number>
  allRecipes.value.forEach((recipe) => categoriesFor(recipe).forEach((category) => counts[category] += 1))
  return FAMILY_CATEGORIES.filter((category) => counts[category]).map((name) => ({ name, count: counts[name] }))
})
const recipes = computed(() => allRecipes.value.filter((recipe) => categoriesFor(recipe).includes(activeCategory.value)))
const collected = computed(() => Object.fromEntries(recipes.value.map((recipe) => [recipe.id, isCollected(recipe.id)])))

const load = async () => {
  categoryLoading.value = true
  error.value = ''
  try {
    const result = await fetchMyRecipes()
    allRecipes.value = result.filter((recipe) => recipe.authorId === user.id)
    if (!allRecipes.value.length) error.value = '暂时没有自己的菜谱'
  } catch (reason) {
    console.error('[my-categories] load failed', reason)
    allRecipes.value = []
    if (!allRecipes.value.length) error.value = '菜品加载失败，请检查服务连接'
  } finally {
    if (!categories.value.some((category) => category.name === activeCategory.value)) activeCategory.value = categories.value[0]?.name || ''
    categoryLoading.value = false
  }
}

const selectCategory = (name: string) => { activeCategory.value = name }
const openRecipe = (id: string) => uni.navigateTo({ url: `/pages-sub/recipe/detail?id=${id}` })

onShow(() => {
  if (!allRecipes.value.length && !categoryLoading.value) load()
})
</script>

<template>
  <view class="page-shell category-page">
    <view class="page-intro">
      <text class="eyebrow">RECIPE INDEX</text>
      <text class="page-title">菜谱分类</text>
      <text class="page-desc">按家庭常用食材，找到今天想做的菜</text>
    </view>

    <view v-if="categoryLoading && !categories.length" class="empty-state">正在加载分类...</view>
    <view v-else-if="error && !categories.length" class="empty-state"><text>{{ error }}</text><text class="retry" @click="load">重新加载</text></view>
    <CategorySplit
      v-else
      :categories="categories"
      :active-category="activeCategory"
      :total="recipes.length"
      :total-label="`${recipes.length} 道菜`"
      eyebrow="CURRENT CATEGORY"
      @select="selectCategory"
    >
      <view v-if="error && !recipes.length" class="empty-state"><text>{{ error }}</text><text class="retry" @click="load">重新加载</text></view>
      <view v-else-if="!categoryLoading && !recipes.length" class="empty-state">这个分类暂时没有菜品</view>
      <view v-else class="feed">
        <RecipeCard v-for="recipe in recipes" :key="recipe.id" :recipe="recipe" :collected="collected[recipe.id]" @open="openRecipe" />
      </view>
    </CategorySplit>
  </view>
</template>

<style scoped>
.category-page { display: flex; flex-direction: column; height: 100vh; padding-top: 42rpx; padding-bottom: 24rpx; box-sizing: border-box; }
.page-intro { flex-shrink: 0; padding: 14rpx 0 26rpx; }
.eyebrow, .results-eyebrow { color: #8b948b; font-size: 20rpx; letter-spacing: 2rpx; }
.page-title { display: block; margin-top: 16rpx; color: #33261e; font-size: 48rpx; font-weight: 700; }
.page-desc { display: block; margin-top: 10rpx; color: #a29388; font-size: 24rpx; line-height: 1.5; }
.retry { display: block; margin-top: 18rpx; color: #c93d20; font-size: 23rpx; }
.feed { display: flex; flex-direction: column; gap: 14rpx; }

@media (max-width: 700px) {
  .category-page { padding-top: 28rpx; }
  .page-title { font-size: 42rpx; }
}
</style>
