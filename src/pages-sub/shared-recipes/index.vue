<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import CategorySplit from '@/components/CategorySplit.vue'
import PageHeader from '@/components/PageHeader.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { DEFAULT_FAMILY_CATEGORY } from '@/constants/recipe'
import { fetchSharedRecipeCategories, fetchSharedRecipes } from '@/services/recipe'
import type { Recipe, UserRecipeCategory } from '@/types'

const shareId = ref('')
const recipes = ref<Recipe[]>([])
const userCategories = ref<UserRecipeCategory[]>([])
const uncategorizedCount = ref(0)
const activeCategory = ref('')
const loading = ref(false)
const error = ref('')

const ownerName = computed(() => recipes.value[0]?.authorName || '分享用户')
const pageTitle = computed(() => `${ownerName.value} 的食谱`)
const categoryNames = computed(() => new Set(userCategories.value.map((category) => category.name)))
const categoriesFor = (recipe: Recipe) => {
  const categories = recipe.categories?.filter((category) => categoryNames.value.has(category)) || []
  return categories.length ? categories : [DEFAULT_FAMILY_CATEGORY]
}
const categoryItems = computed(() => {
  return [
    ...(uncategorizedCount.value > 0 ? [{ name: DEFAULT_FAMILY_CATEGORY, count: uncategorizedCount.value }] : []),
    ...userCategories.value.map((category) => ({ name: category.name, count: category.count }))
  ]
})
const visibleRecipes = computed(() => recipes.value.filter((recipe) => categoriesFor(recipe).includes(activeCategory.value)))

const load = async () => {
  if (!shareId.value) {
    error.value = '分享链接无效'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [nextRecipes, nextCategories] = await Promise.all([fetchSharedRecipes(shareId.value), fetchSharedRecipeCategories(shareId.value)])
    recipes.value = nextRecipes
    uncategorizedCount.value = nextCategories.find((category) => category.name === DEFAULT_FAMILY_CATEGORY)?.count || 0
    userCategories.value = nextCategories.filter((category) => category.id !== 'uncategorized' && category.name !== DEFAULT_FAMILY_CATEGORY)
    if (!categoryItems.value.some((category) => category.name === activeCategory.value)) activeCategory.value = categoryItems.value[0]?.name || ''
    uni.setNavigationBarTitle({ title: pageTitle.value })
  } catch (reason) {
    recipes.value = []
    userCategories.value = []
    uncategorizedCount.value = 0
    error.value = reason instanceof Error ? reason.message : '分享食谱加载失败，请检查服务器连接'
  } finally {
    loading.value = false
  }
}

const selectCategory = (name: string) => { activeCategory.value = name }
const openRecipe = (id: string) => uni.navigateTo({ url: `/pages-sub/recipe/detail?id=${encodeURIComponent(id)}&shareId=${encodeURIComponent(shareId.value)}` })

onLoad((options) => {
  shareId.value = String(options?.shareId || '')
  uni.setNavigationBarTitle({ title: '分享食谱' })
  void load()
})
onShareAppMessage(() => ({ title: pageTitle.value, path: `/pages-sub/shared-recipes/index?shareId=${encodeURIComponent(shareId.value)}` }))
</script>

<template>
  <view class="shared-screen">
    <PageHeader :title="pageTitle" />
    <view class="page-shell shared-page">
    <view class="shared-header"><text class="readonly-label">分享菜单</text></view>
    <view v-if="loading" class="empty-state">正在加载食谱...</view>
    <view v-else-if="error" class="empty-state"><text>{{ error }}</text></view>
    <CategorySplit
      v-else
      :categories="categoryItems"
      :active-category="activeCategory"
      :total="visibleRecipes.length"
      :total-label="`${visibleRecipes.length} 道菜`"
      eyebrow="SHARED RECIPES"
      @select="selectCategory"
    >
      <view v-if="!visibleRecipes.length" class="empty-state">这个分类暂时没有菜品</view>
      <view v-else class="feed">
        <RecipeCard v-for="recipe in visibleRecipes" :key="recipe.id" :recipe="recipe" readonly @open="openRecipe" />
      </view>
    </CategorySplit>
    </view>
  </view>
</template>

<style scoped>
.shared-screen { display: flex; flex-direction: column; min-height: 100vh; background: #fdf8f2; }
.shared-page { display: flex; flex: 1; flex-direction: column; min-height: 0; padding-top: 12rpx; padding-bottom: 20rpx; box-sizing: border-box; }
.shared-header { display: flex; align-items: flex-start; justify-content: flex-end; flex-shrink: 0; padding: 0 2rpx 0; }
.eyebrow { display: block; color: #a18470; font-size: 18rpx; font-weight: 600; letter-spacing: 1.7rpx; }
.page-title { display: block; max-width: 460rpx; margin-top: 11rpx; overflow: hidden; color: #33261e; font-size: 48rpx; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.shared-desc { display: block; margin-top: 8rpx; color: #8b978f; font-size: 22rpx; }
.readonly-label { flex-shrink: 0; margin-top: 30rpx; padding: 10rpx 14rpx; border: 1rpx solid #f2dfd1; border-radius: 999rpx; background: #fff8f3; color: #b87754; font-size: 19rpx; }
:deep(.category-layout) { margin-top: 22rpx; }
.feed { display: flex; flex-direction: column; gap: 14rpx; }
@media (max-width: 700px) {
  .shared-page { padding-top: 20rpx; }
  .page-title { font-size: 42rpx; }
}
</style>
