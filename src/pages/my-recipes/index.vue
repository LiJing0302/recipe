<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { onLoad, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import CategorySplit from '@/components/CategorySplit.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { DEFAULT_FAMILY_CATEGORY } from '@/constants/recipe'
import { createRecipeCategory, createShareLink, deleteRecipeCategory, fetchMyRecipeCategories, fetchMyRecipes, isCollected, loadCollections, toggleCollection, updateRecipeCategory } from '@/services/recipe'
import { clearAuthSession, getCurrentUser, isAuthenticated } from '@/services/storage'
import type { Recipe, UserRecipeCategory } from '@/types'

const recipes = ref<Recipe[]>([])
const userCategories = ref<UserRecipeCategory[]>([])
const activeCategory = ref('')
const loading = ref(false)
const authenticated = ref(false)
const includeImported = ref(false)
const categoryManagerOpen = ref(false)
const categoryFormOpen = ref(false)
const editingCategory = ref<UserRecipeCategory>()
const categoryDraft = ref('')
const categorySaving = ref(false)
const shareId = ref('')

const categoryNames = computed(() => new Set(userCategories.value.map((category) => category.name)))

const categoriesFor = (recipe: Recipe) => {
  const categories = recipe.categories?.filter((category) => categoryNames.value.has(category)) || []
  return categories.length ? categories : [DEFAULT_FAMILY_CATEGORY]
}
const categoryItems = computed(() => {
  const counts = new Map<string, number>([[DEFAULT_FAMILY_CATEGORY, 0]])
  userCategories.value.forEach((category) => counts.set(category.name, 0))
  recipes.value.forEach((recipe) => categoriesFor(recipe).forEach((category) => counts.set(category, (counts.get(category) || 0) + 1)))
  return [
    ...((counts.get(DEFAULT_FAMILY_CATEGORY) || 0) > 0 ? [{ name: DEFAULT_FAMILY_CATEGORY, count: counts.get(DEFAULT_FAMILY_CATEGORY) || 0 }] : []),
    ...userCategories.value.map((category) => ({ name: category.name, count: counts.get(category.name) || 0 }))
  ]
})
const visibleRecipes = computed(() => recipes.value.filter((recipe) => categoriesFor(recipe).includes(activeCategory.value)))
const collected = computed(() => Object.fromEntries(recipes.value.map((recipe) => [recipe.id, isCollected(recipe.id)])))
const load = async () => {
  authenticated.value = isAuthenticated()
  if (!authenticated.value) {
    recipes.value = []
    userCategories.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    await loadCollections()
    const shareLinkPromise = shareId.value ? Promise.resolve({ shareId: shareId.value }) : createShareLink()
    const [nextRecipes, nextCategories, nextShareLink] = await Promise.all([fetchMyRecipes(includeImported.value), fetchMyRecipeCategories(), shareLinkPromise])
    recipes.value = nextRecipes
    userCategories.value = nextCategories.filter((category) => category.id !== 'uncategorized' && category.name !== DEFAULT_FAMILY_CATEGORY)
    shareId.value = nextShareLink.shareId
  } catch (error) {
    recipes.value = []
    userCategories.value = []
    const message = error instanceof Error ? error.message : ''
    if (message.includes('登录') || message.includes('Unauthorized') || message.includes('401')) {
      clearAuthSession()
      authenticated.value = false
      uni.showToast({ title: '登录已失效，请重新登录', icon: 'none' })
    } else {
      uni.showToast({ title: '食谱加载失败，请检查服务器连接', icon: 'none' })
    }
  } finally {
    if (!categoryItems.value.some((category) => category.name === activeCategory.value)) activeCategory.value = categoryItems.value[0]?.name || ''
    loading.value = false
  }
}

const goToLogin = () => uni.navigateTo({ url: '/pages/profile/index' })
const openProfile = () => uni.navigateTo({ url: '/pages/profile/index' })
const selectCategory = (name: string) => { activeCategory.value = name }
const toggleImported = (event: { detail: { value: boolean } }) => { includeImported.value = event.detail.value; void load() }
const openRecipe = (id: string) => uni.navigateTo({ url: `/pages/recipe/detail?id=${encodeURIComponent(id)}` })
const editRecipe = (id: string) => uni.navigateTo({ url: `/pages/recipe/edit?id=${id}` })
const collect = async (id: string) => { try { await toggleCollection(id); await load(); uni.showToast({ title: '已更新收藏', icon: 'none' }) } catch { uni.showToast({ title: '收藏操作失败，请检查服务连接', icon: 'none' }) } }
const shareRecipes = async () => {
  // #ifdef H5
  try {
    if (!shareId.value) shareId.value = (await createShareLink()).shareId
    const url = `${window.location.origin}${window.location.pathname}#/pages/shared-recipes/index?shareId=${encodeURIComponent(shareId.value)}`
    uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '分享链接已复制', icon: 'success' }) })
  } catch {
    uni.showToast({ title: '分享链接生成失败，请稍后重试', icon: 'none' })
  }
  // #endif
}
const categoryFormTitle = computed(() => editingCategory.value ? '重命名分类' : '新增分类')
const openCategoryManager = () => { categoryManagerOpen.value = true }
const closeCategoryManager = () => {
  categoryManagerOpen.value = false
  categoryFormOpen.value = false
}
const openCategoryForm = (category?: UserRecipeCategory) => {
  editingCategory.value = category
  categoryDraft.value = category?.name || ''
  categoryFormOpen.value = true
}
const closeCategoryForm = () => {
  categoryFormOpen.value = false
  editingCategory.value = undefined
  categoryDraft.value = ''
}
const saveCategory = async () => {
  const name = categoryDraft.value.trim()
  if (!name) return uni.showToast({ title: '请输入分类名称', icon: 'none' })
  if (name === DEFAULT_FAMILY_CATEGORY) return uni.showToast({ title: '未分类由系统维护', icon: 'none' })
  const isEditing = Boolean(editingCategory.value)
  categorySaving.value = true
  try {
    if (editingCategory.value) await updateRecipeCategory(editingCategory.value.id, name)
    else await createRecipeCategory(name)
    closeCategoryForm()
    await load()
    uni.showToast({ title: isEditing ? '分类已更新' : '分类已创建', icon: 'success' })
  } catch {
    uni.showToast({ title: '分类保存失败，请稍后重试', icon: 'none' })
  } finally {
    categorySaving.value = false
  }
}
const removeCategory = (category: UserRecipeCategory) => {
  uni.showModal({
    title: '删除分类',
    content: category.count ? `删除后，该分类下的 ${category.count} 道菜会移到“未分类”。` : `确定删除“${category.name}”吗？`,
    confirmColor: '#b64f45',
    success: async (result) => {
      if (!result.confirm) return
      categorySaving.value = true
      try {
        await deleteRecipeCategory(category.id)
        await load()
        uni.showToast({ title: '分类已删除', icon: 'success' })
      } catch {
        uni.showToast({ title: '分类删除失败，请稍后重试', icon: 'none' })
      } finally {
        categorySaving.value = false
      }
    }
  })
}
onLoad((options) => {
  const incomingShareId = String(options?.shareId || '')
  if (incomingShareId) uni.redirectTo({ url: `/pages/shared-recipes/index?shareId=${encodeURIComponent(incomingShareId)}` })
  else if (options?.shareUserId) uni.redirectTo({ url: '/pages/shared-recipes/index' })
})
onShow(() => { void load() })
onShareAppMessage(() => {
  const user = getCurrentUser()
  return { title: `${user.name} 的食谱`, path: `/pages/shared-recipes/index?shareId=${encodeURIComponent(shareId.value)}` }
})
</script>

<template>
  <view class="page-shell my-page">
    <view class="header-row"><view><text class="eyebrow">MY KITCHEN</text><text class="page-title">我的食谱</text></view><view class="header-actions"><view class="profile-entry" aria-label="打开我的" title="打开我的" @click="openProfile"><image src="/static/tabbar/profile-active.png" mode="aspectFit" /><text>我的</text></view><view v-if="authenticated" class="recipe-actions"><!-- #ifdef MP-WEIXIN --><button class="icon-action share-button" :disabled="!shareId" open-type="share" aria-label="分享菜谱" title="分享菜谱"><AppIcon name="share" size="md" /></button><!-- #endif --><!-- #ifdef H5 --><view class="icon-action share-button" aria-label="分享菜谱" title="分享菜谱" @click="shareRecipes"><AppIcon name="share" size="md" /></view><!-- #endif --><view class="icon-action manage-button" aria-label="管理分类" title="管理分类" @click="openCategoryManager"><AppIcon name="settings" size="md" /></view><view class="icon-action add-button" aria-label="新建食谱" title="新建食谱" @click="uni.navigateTo({ url: '/pages/recipe/edit' })"><AppIcon name="plus" size="md" /></view></view></view></view>
    <view v-if="authenticated" class="recipe-note"><AppIcon name="leaf" size="md" /><text>把每一道喜欢的菜，收进自己的厨房</text><text class="recipe-note-count">已收录 {{ recipes.length }} 道</text></view>
    <view v-if="authenticated" class="recipe-filter"><view><text class="filter-title">显示范围</text><text class="filter-desc">{{ includeImported ? '包含广场导入食谱' : '只显示我的原创食谱' }}</text></view><switch :checked="includeImported" color="#c93d20" @change="toggleImported" /></view>
    <view v-if="authenticated" class="recipe-stats" v-show="false"><view><text class="recipe-stat-number">{{ recipes.length }}</text><text class="recipe-stat-label">已收藏</text></view><view class="recipe-stat-divider" /><view><text class="recipe-stat-number">{{ categoryItems.length }}</text><text class="recipe-stat-label">个分类</text></view><view class="recipe-stat-tip">慢慢积累<br />你的味道</view></view>
    <view v-if="loading" class="empty-state">正在加载食谱...</view>
    <view v-else-if="!authenticated" class="auth-required surface">
      <text class="auth-required-title">登录后查看你的食谱</text>
      <text class="auth-required-desc">你的食谱和分类只对当前账号开放</text>
      <button class="primary-button auth-required-button" @click="goToLogin">去登录</button>
    </view>
    <CategorySplit
      v-else
      :categories="categoryItems"
      :active-category="activeCategory"
      :total="visibleRecipes.length"
      :total-label="`${visibleRecipes.length} 道菜`"
      eyebrow="MY RECIPES"
      @select="selectCategory"
    >
      <view v-if="!visibleRecipes.length" class="empty-state">这个分类暂时没有菜品</view>
      <view v-else class="feed">
        <RecipeCard v-for="recipe in visibleRecipes" :key="recipe.id" :recipe="recipe" :collected="collected[recipe.id]" @open="openRecipe" @toggle-collect="collect" @edit="editRecipe" />
      </view>
    </CategorySplit>
    <!-- 管理分类弹窗（up-popup 底部弹层；不用 v-if，关闭时播放收起动画，custom-class 避免在 flex 布局中占位） -->
    <up-popup :show="categoryManagerOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true" @close="closeCategoryManager">
      <view class="category-modal">
        <view class="modal-header"><view><text class="modal-kicker">MY CATEGORIES</text><text class="modal-title">管理分类</text></view><view class="modal-close" @click="closeCategoryManager"><AppIcon name="close" size="md" /></view></view>
        <view class="category-manager-list">
          <view v-if="categoryItems.some((item) => item.name === DEFAULT_FAMILY_CATEGORY)" class="category-manager-item system-category"><view><text class="manager-name">{{ DEFAULT_FAMILY_CATEGORY }}</text><text class="manager-count">{{ categoryItems.find((item) => item.name === DEFAULT_FAMILY_CATEGORY)?.count || 0 }} 道菜 · 系统分类</text></view></view>
          <view v-for="category in userCategories" :key="category.id" class="category-manager-item"><view><text class="manager-name">{{ category.name }}</text><text class="manager-count">{{ categoryItems.find((item) => item.name === category.name)?.count || 0 }} 道菜</text></view><view class="manager-actions"><text class="manager-action" @click="openCategoryForm(category)">编辑</text><text class="manager-action danger" @click="removeCategory(category)">删除</text></view></view>
        </view>
        <button class="primary-button category-add-button" @click="openCategoryForm()"><AppIcon name="plus" size="sm" /> 新增分类</button>
      </view>
    </up-popup>
    <!-- 分类表单弹窗（up-popup 居中；不用 v-if，关闭时播放收起动画，custom-class 避免在 flex 布局中占位） -->
    <up-popup :show="categoryFormOpen" custom-class="popup-static" mode="center" @close="closeCategoryForm">
      <view class="category-form-modal">
        <text class="modal-title">{{ categoryFormTitle }}</text>
        <input v-model="categoryDraft" class="category-input" maxlength="30" :placeholder="editingCategory ? '输入新的分类名称' : '例如：周末大餐'" focus />
        <view class="form-actions"><button class="secondary-button" @click="closeCategoryForm">取消</button><button class="primary-button" :loading="categorySaving" @click="saveCategory">保存</button></view>
      </view>
    </up-popup>
  </view>
</template>

<style scoped>
.my-page { display: flex; flex-direction: column; height: calc(100vh - var(--window-top) - var(--window-bottom)); min-height: 0; padding-top: 28rpx; padding-bottom: 20rpx; box-sizing: border-box; }
.header-row { display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0; padding: 12rpx 2rpx 0; }
.header-actions { display: flex; align-items: center; gap: 10rpx; }
.recipe-actions { display: flex; align-items: center; gap: 10rpx; }
.profile-entry { display: flex; align-items: center; gap: 5rpx; padding: 10rpx 12rpx; border: 1rpx solid #f0e3d6; border-radius: 12rpx; color: #8a6f5f; font-size: 19rpx; }
.profile-entry image { width: 25rpx; height: 25rpx; }
.eyebrow, .results-eyebrow { color: #8c9f94; font-size: 19rpx; font-weight: 600; letter-spacing: 2rpx; }
.page-title { display: block; margin-top: 11rpx; color: #21342e; font-size: 52rpx; font-weight: 750; }
.icon-action { position: relative; display: flex; align-items: center; justify-content: center; width: 66rpx; height: 66rpx; margin: 0; padding: 0; border: 0; border-radius: 18rpx; box-sizing: border-box; }
.icon-action:active { opacity: .72; transform: scale(.96); }
.share-button { border: 1rpx solid #f3d8c7; background: #fff8f3; color: #b36f4c; }
.manage-button { border: 1rpx solid #d8e8dd; background: #f5faf6; color: #36715e; }
.add-button { background: linear-gradient(135deg, #ff8a3d, #e8542e); color: #fff; }
.icon-share { position: relative; width: 31rpx; height: 27rpx; }
.icon-share::before, .icon-share::after { position: absolute; width: 9rpx; height: 9rpx; border: 3rpx solid currentColor; border-radius: 50%; content: ''; }
.icon-share::before { top: 0; left: 11rpx; box-shadow: -11rpx 17rpx 0 -1rpx #fff, -11rpx 17rpx 0 2rpx currentColor, 11rpx 17rpx 0 -1rpx #fff, 11rpx 17rpx 0 2rpx currentColor; }
.icon-share::after { top: 8rpx; left: 9rpx; width: 15rpx; height: 9rpx; border-width: 2rpx 0 0; border-radius: 0; transform: rotate(30deg); box-shadow: 1rpx 0 0 currentColor; }
.icon-category { position: relative; width: 25rpx; height: 25rpx; }
.icon-category::before { position: absolute; top: 1rpx; left: 1rpx; width: 8rpx; height: 8rpx; border: 2rpx solid currentColor; border-radius: 3rpx; box-shadow: 14rpx 0 0 -2rpx #f5faf6, 14rpx 0 0 0 currentColor, 0 14rpx 0 -2rpx #f5faf6, 0 14rpx 0 0 currentColor, 14rpx 14rpx 0 -2rpx #f5faf6, 14rpx 14rpx 0 0 currentColor; content: ''; }
.icon-plus { position: relative; width: 28rpx; height: 28rpx; }
.icon-plus::before, .icon-plus::after { position: absolute; top: 13rpx; left: 2rpx; width: 24rpx; height: 3rpx; border-radius: 99rpx; background: currentColor; content: ''; }
.icon-plus::after { transform: rotate(90deg); }
.recipe-note { display: flex; align-items: center; gap: 10rpx; flex-shrink: 0; margin-top: 20rpx; padding: 15rpx 18rpx; border: 1rpx solid #e4eee6; border-radius: 18rpx; background: #fff; color: #708278; font-size: 20rpx; box-shadow: 0 8rpx 20rpx rgba(35, 74, 55, .035); }
.recipe-note-leaf { width: 15rpx; height: 23rpx; border-radius: 15rpx 2rpx 15rpx 2rpx; background: #83b79b; transform: rotate(-24deg); }
.recipe-note-count { margin-left: auto; color: #b17858; font-size: 18rpx; }
.recipe-filter { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; padding: 16rpx 18rpx; border: 1rpx solid #f0e3d6; border-radius: 18rpx; background: #fff; }
.filter-title, .filter-desc { display: block; }
.filter-title { color: #6f5f54; font-size: 22rpx; font-weight: 600; }
.filter-desc { margin-top: 5rpx; color: #a29388; font-size: 18rpx; }
.recipe-stats { display: flex; align-items: center; gap: 24rpx; margin-top: 16rpx; padding: 20rpx 22rpx; border: 1rpx solid #eee3d8; border-radius: 20rpx; background: #fff9f3; }
.recipe-stat-number, .recipe-stat-label { display: block; }
.recipe-stat-number { color: #7a573f; font-size: 31rpx; font-weight: 800; }
.recipe-stat-label { margin-top: 4rpx; color: #ad8b74; font-size: 18rpx; }
.recipe-stat-divider { width: 1rpx; height: 45rpx; background: #ecd9ca; }
.recipe-stat-tip { margin-left: auto; color: #ae8366; font-size: 18rpx; line-height: 1.45; text-align: right; }
:deep(.category-layout) { margin-top: 16rpx; }
.feed { display: flex; flex-direction: column; gap: 14rpx; }
.auth-required { margin-top: 28rpx; padding: 72rpx 32rpx; text-align: center; }
.auth-required-title, .auth-required-desc { display: block; }
.auth-required-title { color: #263a32; font-size: 30rpx; font-weight: 700; }
.auth-required-desc { margin-top: 14rpx; color: #899189; font-size: 23rpx; }
.auth-required-button { width: 280rpx; margin: 32rpx auto 0; }
.category-modal { width: 100%; max-height: 82vh; padding: 30rpx 28rpx calc(24rpx + env(safe-area-inset-bottom)); overflow-y: auto; border-radius: 48rpx 48rpx 0 0; background: #fff; box-sizing: border-box; }
.category-form-modal { width: 600rpx; padding: 32rpx 28rpx; border-radius: 48rpx; background: #fff; box-sizing: border-box; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; }
.modal-kicker { display: block; color: #9a8c72; font-size: 18rpx; letter-spacing: 2rpx; }
.modal-title { display: block; margin-top: 10rpx; color: #21342e; font-size: 34rpx; font-weight: 750; }
.modal-close { color: #899189; font-size: 48rpx; line-height: 34rpx; }
.category-manager-list { margin-top: 26rpx; }
.category-manager-item { display: flex; align-items: center; justify-content: space-between; min-height: 82rpx; padding: 14rpx 0; border-bottom: 1rpx solid #edf1eb; }
.system-category { color: #899189; }
.manager-name, .manager-count { display: block; }
.manager-name { color: #263a32; font-size: 26rpx; font-weight: 600; }
.manager-count { margin-top: 6rpx; color: #9aa59b; font-size: 20rpx; }
.manager-actions { display: flex; gap: 24rpx; }
.manager-action { color: #c93d20; font-size: 23rpx; }
.manager-action.danger { color: #b64f45; }
.category-add-button { width: 100%; margin-top: 24rpx; }
.category-input { width: 100%; height: 82rpx; margin-top: 24rpx; padding: 0 20rpx; border: 1rpx solid #e1e9df; border-radius: 14rpx; background: #f7f9f5; color: #263a32; font-size: 26rpx; line-height: 82rpx; box-sizing: border-box; }
.form-actions { display: flex; gap: 14rpx; margin-top: 24rpx; }
.form-actions button { flex: 1; height: 78rpx; line-height: 78rpx; }
@media (max-width: 700px) {
  .my-page { padding-top: 20rpx; }
  .page-title { font-size: 44rpx; }
  .header-actions { gap: 7rpx; }
  .icon-action { width: 58rpx; height: 58rpx; border-radius: 15rpx; }
}
</style>

<style scoped>
.my-page { padding-top: 24rpx; }
.eyebrow, .results-eyebrow { color: #c93d20; }
.page-title { color: #33261e; font-family: Georgia, 'Songti SC', serif; letter-spacing: -1rpx; }
.icon-action { border-color: #f0e3d6; background: #fff; color: #6f5f54; box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .05); }
.icon-action .app-icon { color: currentColor; }
.icon-action.add-button { border-color: transparent; background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%); color: #fff; box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .26); }
.recipe-note { border-color: #f0e3d6; background: #fff; color: #8a7a70; box-shadow: 0 8rpx 20rpx rgba(232, 84, 46, .04); }
.recipe-note > .app-icon { color: #e9a13b; }
.recipe-note-leaf { display: none; }
.recipe-note-count { color: #b8862f; }
.recipe-stats { border-color: #f0d9c9; background: linear-gradient(110deg, #fff6ee, #fdf0e4); }
.recipe-stat-number { color: #e8542e; }
.recipe-stat-label { color: #a29388; }
.recipe-stat-divider { background: #f0d9c9; }
.recipe-stat-tip { color: #b8862f; }
.auth-required { border-color: #f0e3d6; }
.auth-required-title { color: #33261e; }
.auth-required-desc { color: #a29388; }
:deep(.category-layout) { border-color: #f0e3d6; box-shadow: 0 16rpx 38rpx rgba(232, 84, 46, .06); }
:deep(.category-results) { background: #fff; }
:deep(.results-title) { color: #33261e; font-family: Georgia, 'Songti SC', serif; }
:deep(.results-count) { color: #b8862f; }
:deep(.recipe-card) { border-color: #f0e3d6; box-shadow: 0 14rpx 30rpx rgba(232, 84, 46, .06); }
:deep(.recipe-title) { color: #33261e; }
:deep(.recipe-subtitle), :deep(.recipe-meta) { color: #a29388; }
:deep(.collect), :deep(.edit) { background: #fdeee7; color: #c93d20; }
:deep(.rating) { color: #e9a13b; }
:deep(.tag) { background: #fdf3e0; color: #b8862f; }
.category-modal, .category-form-modal { border: 1rpx solid #f0e3d6; background: #fff; }
.modal-kicker { color: #b8862f; }
.modal-title { color: #33261e; }
.modal-close { display: flex; align-items: center; justify-content: center; width: 54rpx; height: 54rpx; color: #a29388; }
.category-manager-item { border-color: #f5e9dd; }
.system-category, .manager-count { color: #a29388; }
.manager-name { color: #6f5f54; }
.manager-action { color: #c93d20; }
.manager-action.danger { color: #b64f45; }
.category-add-button { display: flex; align-items: center; justify-content: center; gap: 8rpx; background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%); box-shadow: 0 10rpx 22rpx rgba(232, 84, 46, .24); }
.category-input { border-color: #f0e3d6; background: #fff; color: #33261e; }
</style>
