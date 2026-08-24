<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/AppIcon.vue'
import { INGREDIENT_CATALOG } from '@/constants/ingredients'
import { DEFAULT_FAMILY_CATEGORY, FAMILY_CATEGORIES } from '@/constants/recipe'
import { fetchCommunityRecipes, fetchMyRecipeCategories, fetchMyRecipes, fetchRecipeDetails, importCommunityRecipe } from '@/services/recipe'
import { formatIngredientAmount, getIngredientKey, loadIngredientMappingsRemote, previewIngredientMappings, type IngredientMappingPayload, type IngredientMappingPreview, type IngredientMatch } from '@/services/ingredient-matching'
import { getConfiguredIngredientOptions, loadIngredientConfigsRemote, type ConfiguredIngredientOption } from '@/services/ingredient-config'
import { getInventoryBatches, loadInventoryBatches } from '@/services/inventory'
import { isFollowing, loadFollowing, toggleFollowing } from '@/services/social'
import { getCurrentUser } from '@/services/storage'
import type { Recipe } from '@/types'

type FeedTab = 'following' | 'discover'
type SortMode = 'comprehensive' | 'favorites' | 'likes' | 'latest' | 'comments'
type FilterType = 'category' | 'sort'
type CoverSize = 'small' | 'medium' | 'large'
type ImportCategoryOption = { name: string; count?: number }

const activeFeedTab = ref<FeedTab>('discover')
const activeCategory = ref('全部')
const sortMode = ref<SortMode>('comprehensive')
const activeFilter = ref<FilterType | ''>('')
const allRecipes = ref<Recipe[]>([])
const collected = ref<Record<string, boolean>>({})
const following = ref<Record<string, boolean>>({})
const importCategories = ref<ImportCategoryOption[]>([])
const categoryPickerOpen = ref(false)
const ingredientConfirmOpen = ref(false)
const mappingChoiceOpen = ref(false)
const myIngredientPickerOpen = ref(false)
const myIngredientKeyword = ref('')
const configuredIngredients = ref<ConfiguredIngredientOption[]>([])
const pendingRecipeId = ref('')
const pendingCategoryName = ref('')
const mappingRows = ref<IngredientMappingPreview[]>([])
const mappingChoiceTarget = ref<IngredientMappingPreview>()
const importing = ref(false)
const currentUser = getCurrentUser()
const feedTabs: Array<{ value: FeedTab; label: string }> = [
  { value: 'following', label: '关注' },
  { value: 'discover', label: '发现' }
]
const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'comprehensive', label: '综合' },
  { value: 'favorites', label: '最多收藏' },
  { value: 'likes', label: '最多点赞' },
  { value: 'latest', label: '最新发布' },
  { value: 'comments', label: '最多评论' }
]

const categoriesFor = (recipe: Recipe) => {
  const categories = recipe.categories?.filter((category) => FAMILY_CATEGORIES.includes(category as typeof FAMILY_CATEGORIES[number])) || []
  return categories.length ? categories : [DEFAULT_FAMILY_CATEGORY]
}
const categoryOptions = computed(() => ['全部', ...FAMILY_CATEGORIES])
const favoriteCount = (recipe: Recipe) => recipe.favoriteCount ?? recipe.ratingCount
const likeCount = (recipe: Recipe) => recipe.likeCount ?? recipe.favoriteCount ?? 0
const commentCount = (recipe: Recipe) => recipe.commentCount ?? recipe.ratingCount
const sortLabel = computed(() => sortOptions.find((option) => option.value === sortMode.value)?.label || '综合')
const coverSizes = ref<Record<string, CoverSize>>({})
const coverClass = (recipe: Recipe) => `cover-${coverSizes.value[recipe.id] || 'medium'}`
const classifyCover = (width: number, height: number): CoverSize => {
  if (!width || !height) return 'medium'
  const ratio = width / height
  if (ratio >= 1.75) return 'small'
  if (ratio >= 1) return 'medium'
  return 'large'
}
const getCoverSize = (src: string) => new Promise<CoverSize>((resolve) => {
  uni.getImageInfo({
    src,
    success: ({ width, height }) => resolve(classifyCover(width, height)),
    fail: () => resolve('medium')
  })
})
const visibleRecipes = computed(() => {
  const filtered = allRecipes.value.filter((recipe) => {
    const matchesFeed = activeFeedTab.value === 'discover' || following.value[recipe.authorId]
    const matchesCategory = activeCategory.value === '全部' || categoriesFor(recipe).includes(activeCategory.value as typeof FAMILY_CATEGORIES[number])
    return matchesFeed && matchesCategory
  })
  return [...filtered].sort((left, right) => {
    if (sortMode.value === 'latest') return right.createdAt.localeCompare(left.createdAt)
    if (sortMode.value === 'favorites') return favoriteCount(right) - favoriteCount(left)
    if (sortMode.value === 'likes') return likeCount(right) - likeCount(left)
    if (sortMode.value === 'comments') return commentCount(right) - commentCount(left)
    return (favoriteCount(right) * 2 + right.cookingCount * 0.05 + right.rating * 20) - (favoriteCount(left) * 2 + left.cookingCount * 0.05 + left.rating * 20)
  })
})
const waterfallRecipes = ref<Recipe[]>([])
const waterfallKey = computed(() => `${activeFeedTab.value}-${activeCategory.value}-${sortMode.value}-${visibleRecipes.value.map((recipe) => recipe.id).join(',')}`)
const getMyIngredientOptions = (): ConfiguredIngredientOption[] => {
  const options = new Map<string, ConfiguredIngredientOption>()
  // 食材分类页展示的是完整系统目录，未单独保存单位配置的目录食材也应可被指定。
  INGREDIENT_CATALOG.forEach((item) => options.set(getIngredientKey(item.name), { ingredientKey: getIngredientKey(item.name), name: item.name, category: item.category }))
  getConfiguredIngredientOptions().forEach((item) => options.set(item.ingredientKey, item))
  getInventoryBatches().forEach((batch) => {
    const ingredientKey = batch.ingredientKey || getIngredientKey(batch.name)
    if (!options.has(ingredientKey)) options.set(ingredientKey, { ingredientKey, name: batch.name, category: batch.category || '其他' })
  })
  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
}

const load = async () => {
  await Promise.all([loadFollowing().catch(() => []), loadInventoryBatches().catch(() => [])])
  let recipes: Recipe[] = []
  try {
    recipes = await fetchCommunityRecipes()
  } catch (error) {
    console.error('[community] load failed', error)
  }
  const coverEntries = await Promise.all(recipes.map(async (recipe) => [recipe.id, await getCoverSize(recipe.cover)] as const))
  coverSizes.value = Object.fromEntries(coverEntries)
  allRecipes.value = recipes
  let importedRecipes: Recipe[] = []
  try { importedRecipes = await fetchMyRecipes(true) } catch { /* 未登录时只显示导入操作 */ }
  const importedIds = new Set(importedRecipes.map((recipe) => recipe.originRecipeId).filter(Boolean))
  collected.value = Object.fromEntries(allRecipes.value.map((recipe) => [recipe.id, importedIds.has(recipe.id)]))
  following.value = Object.fromEntries(allRecipes.value.map((recipe) => [recipe.authorId, isFollowing(recipe.authorId)]))
  if (!categoryOptions.value.includes(activeCategory.value)) activeCategory.value = '全部'
}
const collect = async (id: string) => {
  if (collected.value[id]) {
    uni.showToast({ title: '这道菜已在我的食谱', icon: 'none' })
    return
  }
  try {
    const [categories, recipe] = await Promise.all([
      fetchMyRecipeCategories(),
      fetchRecipeDetails(id),
      loadIngredientConfigsRemote().catch(() => [])
    ])
    await loadIngredientMappingsRemote().catch(() => [])
    configuredIngredients.value = getMyIngredientOptions()
    importCategories.value = [...categories.map((category) => ({ name: category.name, count: category.count })), { name: '未分类', count: 0 }]
    pendingRecipeId.value = id
    mappingRows.value = previewIngredientMappings(recipe.ingredients)
    categoryPickerOpen.value = true
  } catch {
    uni.showToast({ title: '导入信息加载失败，请检查服务连接', icon: 'none' })
  }
}
const closeCategoryPicker = () => { if (!importing.value) categoryPickerOpen.value = false }
const openIngredientConfirm = (categoryName: string) => {
  if (importing.value || !pendingRecipeId.value) return
  pendingCategoryName.value = categoryName
  categoryPickerOpen.value = false
  ingredientConfirmOpen.value = true
}
const closeIngredientConfirm = () => {
  if (importing.value) return
  ingredientConfirmOpen.value = false
  mappingChoiceOpen.value = false
  myIngredientPickerOpen.value = false
  myIngredientKeyword.value = ''
  mappingChoiceTarget.value = undefined
}
const unresolvedCount = computed(() => mappingRows.value.filter((row) => row.status === 'unmatched').length)
const mappingMethodLabel = (method?: IngredientMappingPayload['matchMethod']) => {
  if (method === 'alias') return '别名匹配'
  if (method === 'ai') return '已确认匹配'
  if (method === 'manual') return '手动匹配'
  return '名称匹配'
}
const openMappingChoice = (row: IngredientMappingPreview) => {
  if (importing.value) return
  mappingChoiceTarget.value = row
  mappingChoiceOpen.value = true
}
const openMyIngredientPicker = () => {
  if (importing.value) return
  mappingChoiceOpen.value = false
  myIngredientKeyword.value = ''
  myIngredientPickerOpen.value = true
}
const closeMyIngredientPicker = () => {
  if (importing.value) return
  myIngredientPickerOpen.value = false
  myIngredientKeyword.value = ''
}
const filteredConfiguredIngredients = computed(() => {
  const keyword = myIngredientKeyword.value.trim().toLowerCase()
  if (!keyword) return []
  return configuredIngredients.value.filter((item) => `${item.name}${item.category}`.toLowerCase().includes(keyword))
})
const updateMyIngredientKeyword = (event: { detail?: { value?: string }; target?: { value?: string } }) => {
  myIngredientKeyword.value = event.detail?.value ?? event.target?.value ?? ''
}
const selectConfiguredIngredient = (candidate: ConfiguredIngredientOption) => {
  const row = mappingChoiceTarget.value
  if (!row) return
  const target: IngredientMatch = {
    ingredientKey: candidate.ingredientKey,
    name: candidate.name,
    category: candidate.category,
    unit: '',
    method: 'manual',
    confidence: 1
  }
  const mapping: IngredientMappingPayload = {
    sourceName: row.ingredient.name,
    ingredientKey: candidate.ingredientKey,
    targetName: candidate.name,
    targetCategory: candidate.category,
    matchMethod: 'manual',
    confidence: 1
  }
  row.status = 'matched'
  row.target = target
  row.mapping = mapping
  closeMyIngredientPicker()
  mappingChoiceTarget.value = undefined
}
const openRowAction = (row: IngredientMappingPreview) => {
  openMappingChoice(row)
}
const selectMappingCandidate = (candidate: IngredientMatch) => {
  const row = mappingChoiceTarget.value
  if (!row) return
  const mapping: IngredientMappingPayload = {
    sourceName: row.ingredient.name,
    ingredientKey: candidate.ingredientKey,
    targetName: candidate.name,
    targetCategory: candidate.category,
    matchMethod: candidate.method,
    confidence: candidate.confidence
  }
  row.status = 'matched'
  row.target = candidate
  row.mapping = mapping
  mappingChoiceOpen.value = false
  myIngredientPickerOpen.value = false
  mappingChoiceTarget.value = undefined
}
const keepSourceIngredient = () => {
  const row = mappingChoiceTarget.value
  if (!row) return
  row.status = 'kept'
  row.target = undefined
  row.mapping = undefined
  mappingChoiceOpen.value = false
  mappingChoiceTarget.value = undefined
}
const confirmIngredientImport = async () => {
  if (importing.value || !pendingRecipeId.value) return
  if (unresolvedCount.value) {
    uni.showToast({ title: `还有 ${unresolvedCount.value} 项食材待处理`, icon: 'none' })
    return
  }
  importing.value = true
  try {
    const mappings = mappingRows.value.flatMap((row) => row.mapping ? [row.mapping] : [])
    await importCommunityRecipe(pendingRecipeId.value, pendingCategoryName.value === '未分类' ? undefined : pendingCategoryName.value, mappings, mappingRows.value.filter((row) => row.status === 'kept').map((row) => row.ingredient.name))
    collected.value[pendingRecipeId.value] = true
    ingredientConfirmOpen.value = false
    uni.showToast({ title: '已加入我的食谱', icon: 'success' })
  } catch (error) {
    console.error('[community] import failed', error)
    uni.showToast({ title: '加入失败，请检查服务器连接', icon: 'none' })
  } finally {
    importing.value = false
  }
}
const follow = async (authorId: string) => {
  try { following.value[authorId] = await toggleFollowing(authorId) } catch { uni.showToast({ title: '关注操作失败，请检查服务连接', icon: 'none' }); return }
  following.value = { ...following.value }
  uni.showToast({ title: following.value[authorId] ? '已关注作者' : '已取消关注', icon: 'none' })
}
const openFilter = (filter: FilterType) => { activeFilter.value = filter }
const closeFilter = () => { activeFilter.value = '' }
const selectCategory = (category: string) => { activeCategory.value = category; closeFilter() }
const selectSort = (sort: SortMode) => { sortMode.value = sort; closeFilter() }
const openRecipe = (id: string) => uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` })
onShow(load)
watch(visibleRecipes, (recipes) => { waterfallRecipes.value = [...recipes] }, { immediate: true })
</script>

<template>
  <view class="page-shell community-page">
    <view class="community-header"><view><text class="community-eyebrow">COMMUNITY</text><text class="community-heading">广场</text></view><text class="my-recipes-entry" @click="uni.navigateTo({ url: '/pages/my-recipes/index' })">我的食谱</text></view>
    <view class="feed-tabs"><text v-for="tab in feedTabs" :key="tab.value" class="feed-tab" :class="{ active: activeFeedTab === tab.value }" @click="activeFeedTab = tab.value">{{ tab.label }}</text></view>
    <view class="filter-row"><view class="filter-chip" :class="{ active: activeFilter === 'category' || activeCategory !== '全部' }" @click="openFilter('category')"><text class="filter-name">分类</text><text class="filter-value">{{ activeCategory }}</text><text class="filter-arrow">⌄</text></view><view class="filter-chip" :class="{ active: activeFilter === 'sort' || sortMode !== 'comprehensive' }" @click="openFilter('sort')"><text class="filter-name">排序</text><text class="filter-value">{{ sortLabel }}</text><text class="filter-arrow">⌄</text></view></view>
    <view class="result-row"><text class="result-count">{{ visibleRecipes.length }} 道公开菜谱</text></view>
    <view v-if="!visibleRecipes.length" class="empty-state"><text>{{ activeFeedTab === 'following' ? '还没有关注作者' : '没有找到合适的食谱' }}</text><br /><text class="caption">{{ activeFeedTab === 'following' ? '在发现页关注作者后，这里会展示他们的新菜' : '试试搜索“番茄”或切换分类' }}</text></view>
    <up-waterfall v-else :key="waterfallKey" v-model="waterfallRecipes" :columns="2" :add-time="40" class="waterfall"><template #default="{ item }"><view class="community-card" @click="openRecipe(item.id)"><view class="community-cover" :class="coverClass(item)"><image :src="item.cover" mode="aspectFill" /></view><view class="community-body"><view class="title-row"><text class="community-title">{{ item.title }}</text><text class="collect-action" @click.stop="collect(item.id)">{{ collected[item.id] ? '已加入' : '加入我的食谱' }}</text></view><text class="community-subtitle">{{ item.subtitle }}</text><view class="author-row"><image :src="item.authorAvatar" mode="aspectFill" /><text class="author-name">{{ item.authorName }}</text><text v-if="item.authorId !== currentUser.id" class="follow-action" @click.stop="follow(item.authorId)">{{ following[item.authorId] ? '已关注' : '关注' }}</text><text class="favorite-count">{{ favoriteCount(item) }} 收藏</text></view><view class="tag-row"><text v-for="tag in item.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</text></view></view></view></template></up-waterfall>
    <view v-if="activeFilter" class="modal-mask" @click="closeFilter"><view class="filter-modal" @click.stop><view class="filter-modal-head"><text class="filter-modal-title">{{ activeFilter === 'category' ? '选择分类' : '选择排序' }}</text><text class="filter-close" @click="closeFilter">×</text></view><view v-if="activeFilter === 'category'" class="filter-options"><view v-for="category in categoryOptions" :key="category" class="filter-option" :class="{ selected: activeCategory === category }" @click="selectCategory(category)"><text>{{ category }}</text><text v-if="activeCategory === category" class="filter-check">✓</text></view></view><view v-else class="filter-options"><view v-for="option in sortOptions" :key="option.value" class="filter-option" :class="{ selected: sortMode === option.value }" @click="selectSort(option.value)"><text>{{ option.label }}</text><text v-if="sortMode === option.value" class="filter-check">✓</text></view></view></view></view>
    <up-popup :show="categoryPickerOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true" @close="closeCategoryPicker">
      <view class="import-picker">
        <view class="import-picker-header"><view><text class="import-picker-eyebrow">ADD TO MY RECIPES</text><text class="import-picker-title">选择食谱分类</text><text class="import-picker-desc">把这道菜收进你的厨房，之后也可以重新分类</text></view><view class="import-picker-close" @click="closeCategoryPicker"><AppIcon name="close" size="md" /></view></view>
        <view class="import-category-list"><view v-for="category in importCategories" :key="category.name" class="import-category-option" :class="{ disabled: importing }" @click="openIngredientConfirm(category.name)"><view class="import-category-main"><view class="import-category-icon"><AppIcon name="grid" size="md" /></view><view><text class="import-category-name">{{ category.name }}</text><text class="import-category-count">{{ category.name === '未分类' ? '稍后再整理' : `${category.count || 0} 道食谱` }}</text></view></view><AppIcon name="chevron-right" size="sm" /></view></view>
        <view v-if="importing" class="importing-state"><view class="importing-dot" /><text>正在加入你的食谱...</text></view>
        <view class="import-picker-cancel" :class="{ disabled: importing }" @click="closeCategoryPicker">取消</view>
      </view>
    </up-popup>

    <up-popup :show="ingredientConfirmOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true" @close="closeIngredientConfirm">
      <view class="ingredient-confirm-sheet">
        <view class="import-picker-header">
          <view>
            <text class="import-picker-eyebrow">INGREDIENT IMPORT</text>
            <text class="import-picker-title">确认食材导入</text>
            <text class="import-picker-desc">只确认食材对应关系。来源单位和换算会随食谱保留，不会修改你的食材库</text>
          </view>
          <view class="import-picker-close" @click="closeIngredientConfirm"><AppIcon name="close" size="md" /></view>
        </view>

        <view class="ingredient-import-summary">
          <view><text class="ingredient-summary-number">{{ mappingRows.length }}</text><text class="ingredient-summary-label">项食材</text></view>
          <view class="ingredient-summary-status" :class="{ ready: !unresolvedCount }"><AppIcon :name="unresolvedCount ? 'info' : 'check'" size="sm" /><text>{{ unresolvedCount ? `${unresolvedCount} 项待处理` : '全部已确认' }}</text></view>
        </view>

        <scroll-view class="ingredient-mapping-list" scroll-y>
          <view v-for="row in mappingRows" :key="row.ingredient.id" class="ingredient-mapping-row">
            <view class="ingredient-mapping-main">
              <view class="ingredient-mapping-name-row"><text class="ingredient-mapping-name">{{ row.ingredient.name }}</text><text class="ingredient-mapping-amount">{{ formatIngredientAmount(row.ingredient.amount) }}</text></view>
              <view v-if="row.status === 'matched'" class="ingredient-mapping-result success"><AppIcon name="check" size="xs" /><text>匹配为 {{ row.target?.name }}，保留来源单位</text><text class="ingredient-mapping-method">{{ mappingMethodLabel(row.mapping?.matchMethod) }}</text></view>
              <view v-else-if="row.status === 'kept'" class="ingredient-mapping-result kept"><AppIcon name="info" size="xs" /><text>保留原食材名，不参与食材库匹配</text></view>
              <view v-else class="ingredient-mapping-result pending"><AppIcon name="info" size="xs" /><text>暂未找到对应食材</text></view>
            </view>
            <button v-if="row.status === 'unmatched'" class="mapping-action" :disabled="importing" @click="openRowAction(row)">处理</button>
            <button v-else class="mapping-action secondary" :disabled="importing" @click="openRowAction(row)">调整</button>
          </view>
        </scroll-view>

        <view class="ingredient-import-category"><text>导入分类</text><text class="ingredient-import-category-value">{{ pendingCategoryName }}</text></view>
        <button class="primary-button ingredient-confirm-button" :class="{ disabled: unresolvedCount || importing }" :disabled="Boolean(unresolvedCount) || importing" @click="confirmIngredientImport">{{ importing ? '正在导入...' : unresolvedCount ? `处理剩余 ${unresolvedCount} 项后导入` : '确认加入我的食谱' }}</button>
        <view class="import-picker-cancel" :class="{ disabled: importing }" @click="closeIngredientConfirm">返回</view>
      </view>
    </up-popup>

    <up-popup :show="mappingChoiceOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true" @close="mappingChoiceOpen = false">
      <view class="mapping-choice-sheet">
        <view class="import-picker-header"><view><text class="import-picker-eyebrow">CHOOSE MATCH</text><text class="import-picker-title">处理「{{ mappingChoiceTarget?.ingredient.name }}」</text><text class="import-picker-desc">选择一个对应的食材，或保留原食材名</text></view><view class="import-picker-close" @click="mappingChoiceOpen = false"><AppIcon name="close" size="md" /></view></view>
        <view class="mapping-candidate-list">
          <view v-for="candidate in mappingChoiceTarget?.candidates || []" :key="candidate.ingredientKey" class="mapping-candidate" @click="selectMappingCandidate(candidate)"><view><text class="mapping-candidate-name">{{ candidate.name }}</text><text class="mapping-candidate-meta">{{ candidate.category }} · {{ candidate.method === 'ai' ? '候选匹配' : '名称匹配' }}</text></view><AppIcon name="chevron-right" size="sm" /></view>
          <view class="mapping-candidate choose-mine" @click="openMyIngredientPicker"><view><text class="mapping-candidate-name">指定我的食材</text><text class="mapping-candidate-meta">从我的食材库选择对应食材，不修改单位配置</text></view><AppIcon name="chevron-right" size="sm" /></view>
          <view class="mapping-candidate keep-source" @click="keepSourceIngredient"><view><text class="mapping-candidate-name">保留原食材名</text><text class="mapping-candidate-meta">导入后不与我的食材库关联</text></view><AppIcon name="chevron-right" size="sm" /></view>
        </view>
      </view>
    </up-popup>

    <up-popup :show="myIngredientPickerOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true" @close="closeMyIngredientPicker">
      <view class="mapping-choice-sheet my-ingredient-sheet">
        <view class="import-picker-header"><view><text class="import-picker-eyebrow">MY INGREDIENTS</text><text class="import-picker-title">指定我的食材</text><text class="import-picker-desc">选择后仅建立本次导入的对应关系，不会改动你的单位和换算配置</text></view><view class="import-picker-close" @click="closeMyIngredientPicker"><AppIcon name="close" size="md" /></view></view>
        <input :value="myIngredientKeyword" class="my-ingredient-search" placeholder="搜索我的食材" @input="updateMyIngredientKeyword" />
        <scroll-view class="mapping-candidate-list my-ingredient-list" scroll-y>
          <view v-for="candidate in filteredConfiguredIngredients" :key="candidate.ingredientKey" class="mapping-candidate" @click="selectConfiguredIngredient(candidate)"><view><text class="mapping-candidate-name">{{ candidate.name }}</text><text class="mapping-candidate-meta">{{ candidate.category }}</text></view><AppIcon name="chevron-right" size="sm" /></view>
          <view v-if="!filteredConfiguredIngredients.length" class="my-ingredient-empty"><AppIcon name="info" size="sm" /><text>{{ myIngredientKeyword.trim() ? (configuredIngredients.length ? '没有找到匹配的我的食材' : '我的食材库暂无食材') : '输入食材名称开始搜索' }}</text></view>
        </scroll-view>
        <view class="import-picker-cancel" :class="{ disabled: importing }" @click="closeMyIngredientPicker">返回</view>
      </view>
    </up-popup>

  </view>
</template>

<style scoped>
.community-page { padding-top: 28rpx; padding-bottom: 120rpx; }
.community-header { display: flex; align-items: flex-end; justify-content: space-between; margin: 0 2rpx 26rpx; }
.community-eyebrow { display: block; color: #b8862f; font-size: 15rpx; letter-spacing: 1rpx; }
.community-heading { display: block; margin-top: 10rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 50rpx; font-weight: 700; }
.my-recipes-entry { padding: 13rpx 18rpx; border: 1rpx solid #f0e3d6; border-radius: 12rpx; color: #c93d20; font-size: 22rpx; }
.feed-tabs { display: flex; gap: 30rpx; margin-top: 26rpx; border-bottom: 1rpx solid #f5e9dd; }
.feed-tab { position: relative; padding: 0 4rpx 16rpx; color: #a29388; font-size: 28rpx; }
.feed-tab.active { color: #c93d20; font-weight: 700; }
.feed-tab.active::after { position: absolute; right: 4rpx; bottom: -1rpx; left: 4rpx; height: 5rpx; border-radius: 5rpx; background: #c93d20; content: ''; }
.filter-row { display: flex; gap: 16rpx; margin-top: 22rpx; }
.filter-chip { display: flex; flex: 1; align-items: center; min-width: 0; height: 72rpx; padding: 0 18rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; color: #8a7a70; }
.filter-chip.active { border-color: #c93d20; color: #c93d20; }
.filter-name { flex-shrink: 0; font-size: 23rpx; font-weight: 700; }
.filter-value { min-width: 0; margin-left: 12rpx; overflow: hidden; color: #a29388; font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }
.filter-chip.active .filter-value { color: #c93d20; }
.filter-arrow { flex-shrink: 0; margin-left: auto; padding-left: 10rpx; color: #a29388; font-size: 25rpx; line-height: 1; }
.result-row { margin-top: 16rpx; }
.result-count { color: #a29388; font-size: 21rpx; }
.modal-mask { position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; background: rgba(23,34,30,.42); }
.filter-modal { width: 100%; max-height: 78vh; padding: 30rpx 32rpx calc(28rpx + env(safe-area-inset-bottom)); overflow-y: auto; border-radius: 28rpx 28rpx 0 0; background: #fff; }
.filter-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.filter-modal-title { color: #33261e; font-size: 30rpx; font-weight: 700; }
.filter-close { width: 44rpx; height: 44rpx; color: #a29388; font-size: 42rpx; line-height: 38rpx; text-align: center; }
.filter-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; }
.filter-option { display: flex; align-items: center; justify-content: space-between; min-height: 76rpx; padding: 0 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; color: #6f5f54; font-size: 24rpx; }
.filter-option.selected { border-color: #c93d20; background: #fdeee7; color: #c93d20; font-weight: 700; }
.filter-check { color: #e9a13b; font-size: 28rpx; }
.import-picker { width: 100%; max-height: 82vh; padding: 30rpx 28rpx calc(24rpx + env(safe-area-inset-bottom)); overflow-y: auto; border: 1rpx solid #f0e3d6; border-radius: 28rpx 28rpx 0 0; background: #fff; box-sizing: border-box; }
.import-picker-header { display: flex; align-items: flex-start; justify-content: space-between; }
.import-picker-eyebrow { display: block; color: #b8862f; font-size: 16rpx; font-weight: 700; letter-spacing: 2rpx; }
.import-picker-title { display: block; margin-top: 10rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 36rpx; font-weight: 700; }
.import-picker-desc { display: block; margin-top: 8rpx; color: #a29388; font-size: 21rpx; line-height: 1.4; }
.import-picker-close { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 16rpx; background: #fff8f3; color: #a29388; }
.import-category-list { display: flex; flex-direction: column; gap: 12rpx; margin-top: 26rpx; }
.import-category-option { display: flex; align-items: center; justify-content: space-between; min-height: 86rpx; padding: 14rpx 18rpx; border: 1rpx solid #f0e3d6; border-radius: 16rpx; background: #fffaf5; color: #a29388; }
.import-category-option:active { border-color: #e9a13b; background: #fff4e8; }
.import-category-option.disabled { opacity: .6; }
.import-category-main { display: flex; align-items: center; gap: 14rpx; min-width: 0; }
.import-category-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 50rpx; height: 50rpx; border-radius: 15rpx; background: #fdeee7; color: #c93d20; }
.import-category-name, .import-category-count { display: block; }
.import-category-name { color: #6f5f54; font-size: 25rpx; font-weight: 700; }
.import-category-count { margin-top: 5rpx; color: #b8a398; font-size: 18rpx; }
.import-category-option > .app-icon { color: #d5b6a4; }
.importing-state { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 18rpx; color: #c93d20; font-size: 20rpx; }
.importing-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #e9a13b; }
.import-picker-cancel { display: flex; align-items: center; justify-content: center; height: 72rpx; margin-top: 16rpx; border: 1rpx solid #f0e3d6; border-radius: 16rpx; color: #a29388; font-size: 23rpx; }
.import-picker-cancel:active { background: #fff8f3; }
.import-picker-cancel.disabled { opacity: .55; }
.ingredient-confirm-sheet, .mapping-choice-sheet { width: 100%; max-height: 86vh; padding: 30rpx 28rpx calc(24rpx + env(safe-area-inset-bottom)); overflow: hidden; border: 1rpx solid #f0e3d6; border-radius: 28rpx 28rpx 0 0; background: #fff; box-sizing: border-box; }
.ingredient-import-summary { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; padding: 18rpx 20rpx; border-radius: 16rpx; background: #fff8f3; }
.ingredient-summary-number { color: #c93d20; font-size: 34rpx; font-weight: 700; }
.ingredient-summary-label { margin-left: 6rpx; color: #8a7a70; font-size: 21rpx; }
.ingredient-summary-status { display: flex; align-items: center; gap: 7rpx; color: #b8862f; font-size: 21rpx; }
.ingredient-summary-status.ready { color: #5f8c70; }
.ingredient-mapping-list { height: 48vh; margin-top: 14rpx; }
.ingredient-mapping-row { display: flex; align-items: center; gap: 14rpx; min-height: 104rpx; padding: 16rpx 4rpx; border-bottom: 1rpx solid #f7efe6; }
.ingredient-mapping-main { flex: 1; min-width: 0; }
.ingredient-mapping-name-row { display: flex; align-items: baseline; gap: 12rpx; min-width: 0; }
.ingredient-mapping-name { overflow: hidden; color: #33261e; font-size: 25rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.ingredient-mapping-amount { flex-shrink: 0; color: #8a7a70; font-size: 21rpx; }
.ingredient-mapping-result { display: flex; align-items: center; gap: 5rpx; margin-top: 9rpx; overflow: hidden; font-size: 19rpx; text-overflow: ellipsis; white-space: nowrap; }
.ingredient-mapping-result.success { color: #5f8c70; }
.ingredient-mapping-result.pending { color: #b8862f; }
.ingredient-mapping-result.kept { color: #a29388; }
.ingredient-mapping-method { margin-left: 3rpx; color: #b8a398; }
.mapping-action { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 92rpx; height: 56rpx; margin: 0; padding: 0; border: 1rpx solid #e9a13b; border-radius: 12rpx; background: #fff8ed; color: #a96e18; font-size: 21rpx; line-height: 56rpx; }
.mapping-action.secondary { border-color: #f0e3d6; background: #fff; color: #a29388; }
.mapping-action::after { border: 0; }
.mapping-action[disabled] { opacity: .55; }
.ingredient-import-category { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; padding: 16rpx 4rpx 0; color: #8a7a70; font-size: 21rpx; }
.ingredient-import-category-value { color: #c93d20; font-weight: 700; }
.ingredient-confirm-button { margin-top: 16rpx; }
.ingredient-confirm-button.disabled { opacity: .52; box-shadow: none; }
.mapping-choice-sheet { padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
.mapping-candidate-list { display: flex; flex-direction: column; gap: 12rpx; margin-top: 24rpx; overflow-y: auto; }
.mapping-candidate { display: flex; align-items: center; justify-content: space-between; min-height: 78rpx; padding: 12rpx 18rpx; border: 1rpx solid #f0e3d6; border-radius: 16rpx; background: #fffaf5; }
.mapping-candidate:active { border-color: #e9a13b; background: #fff4e8; }
.mapping-candidate.keep-source { border-color: #e8ddd4; background: #fff; }
.mapping-candidate.choose-mine { border-color: #d8e8dd; background: #f7fbf8; }
.mapping-candidate-name, .mapping-candidate-meta { display: block; }
.mapping-candidate-name { color: #6f5f54; font-size: 24rpx; font-weight: 700; }
.mapping-candidate-meta { margin-top: 5rpx; color: #b8a398; font-size: 18rpx; }
.mapping-candidate > .app-icon { color: #d5b6a4; }
.my-ingredient-search { height: 76rpx; margin-top: 22rpx; padding: 0 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fffaf5; color: #33261e; font-size: 24rpx; box-sizing: border-box; }
.my-ingredient-list { max-height: 48vh; }
.my-ingredient-empty { display: flex; align-items: center; justify-content: center; gap: 8rpx; min-height: 120rpx; color: #a29388; font-size: 21rpx; }
.waterfall { margin-top: 18rpx; }
.community-card { display: inline-block; width: 100%; margin-bottom: 18rpx; overflow: hidden; break-inside: avoid; border-radius: 18rpx; background: #fff; box-shadow: 0 8rpx 24rpx rgba(27,61,53,.06); }
.community-cover { position: relative; width: 100%; height: 0; overflow: hidden; background: #f7ede3; }
.community-cover.cover-small { padding-top: 75%; }
.community-cover.cover-medium { padding-top: 100%; }
.community-cover.cover-large { padding-top: 125%; }
.community-cover image { position: absolute; top: 0; left: 0; display: block; width: 100%; height: 100%; }
.community-body { padding: 16rpx 16rpx 18rpx; }
.title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8rpx; }
.community-title { color: #33261e; font-size: 27rpx; font-weight: 700; line-height: 1.35; }
.collect-action { flex-shrink: 0; color: #c93d20; font-size: 19rpx; }
.community-subtitle { display: block; margin-top: 8rpx; overflow: hidden; color: #a29388; font-size: 21rpx; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.author-row { display: flex; align-items: center; gap: 7rpx; margin-top: 16rpx; color: #8a7a70; font-size: 19rpx; }
.author-row image { width: 28rpx; height: 28rpx; border-radius: 50%; background: #f7ede3; }
.author-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.follow-action { flex-shrink: 0; color: #c93d20; }
.favorite-count { margin-left: auto; flex-shrink: 0; color: #b8862f; }
.tag-row { display: flex; gap: 6rpx; margin-top: 12rpx; }
.tag { padding: 5rpx 8rpx; border-radius: 6rpx; background: #fdeee7; color: #8a7a70; font-size: 17rpx; }
</style>
