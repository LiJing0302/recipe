<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CategorySplit from '@/components/CategorySplit.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { DEFAULT_FAMILY_CATEGORY, FAMILY_CATEGORIES } from '@/constants/recipe'
import { API_BASE_URL } from '@/config'
import { createRecipeCategory, createShareLink, deleteRecipeCategory, fetchCommunityRecipes, fetchMyRecipeCategories, fetchMyRecipes, fetchPublicRecipeCategories, isCollected, loadCollections, toggleCollection, updateRecipeCategory } from '@/services/recipe'
import { clearAuthSession, getCurrentUser, isAuthenticated } from '@/services/storage'
import type { Recipe, RecipeCategory, UserRecipeCategory } from '@/types'

const props = defineProps<{ active: boolean }>()

const recipes = ref<Recipe[]>([])
const userCategories = ref<UserRecipeCategory[]>([])
const defaultCategories = ref<RecipeCategory[]>(FAMILY_CATEGORIES.map((name) => ({ name, count: 0 })))
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
const loaded = ref(false)
const recipeBackdropSrc = `${API_BASE_URL}/uploads/object?key=${encodeURIComponent('recipes/assets/recipes-backdrop.png')}`

const categoryNames = computed(() => new Set((authenticated.value ? userCategories.value : defaultCategories.value).map((category) => category.name)))

const categoriesFor = (recipe: Recipe) => {
  const categories = recipe.categories?.filter((category) => categoryNames.value.has(category)) || []
  return categories.length ? categories : [DEFAULT_FAMILY_CATEGORY]
}
const categoryItems = computed(() => {
  if (!authenticated.value) return defaultCategories.value
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
const recipeTitle = computed(() => (authenticated.value ? `${getCurrentUser().name} 的食谱` : '精选食谱'))
const loadPublicContent = async () => {
  const [nextRecipes, nextCategories] = await Promise.all([fetchCommunityRecipes(), fetchPublicRecipeCategories()])
  recipes.value = nextRecipes
  userCategories.value = []
  defaultCategories.value = nextCategories.length ? nextCategories : FAMILY_CATEGORIES.map((name) => ({ name, count: 0 }))
}
const load = async () => {
  authenticated.value = isAuthenticated()
  loading.value = true
  if (!authenticated.value) {
    try {
      await loadPublicContent()
    } catch {
      recipes.value = []
      userCategories.value = []
      uni.showToast({ title: '默认食谱加载失败，请检查服务器连接', icon: 'none' })
    } finally {
      if (!categoryItems.value.some((category) => category.name === activeCategory.value)) activeCategory.value = categoryItems.value[0]?.name || ''
      loading.value = false
      loaded.value = true
    }
    return
  }
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
    loaded.value = true
  }
}

const openCommunity = () => uni.navigateTo({ url: '/pages/community/index' })
const selectCategory = (name: string) => { activeCategory.value = name }
const toggleImported = (event: { detail: { value: boolean } }) => { includeImported.value = event.detail.value; void load() }
const openRecipe = (id: string) => uni.navigateTo({ url: `/pages-sub/recipe/detail?id=${encodeURIComponent(id)}` })
const editRecipe = (id: string) => uni.navigateTo({ url: `/pages-sub/recipe/edit?id=${id}` })
const collect = async (id: string) => { try { await toggleCollection(id); await load(); uni.showToast({ title: '已更新收藏', icon: 'none' }) } catch { uni.showToast({ title: '收藏操作失败，请检查服务连接', icon: 'none' }) } }
const shareRecipes = async () => {
  // #ifdef H5
  try {
    if (!shareId.value) shareId.value = (await createShareLink()).shareId
    const url = `${window.location.origin}${window.location.pathname}#/pages-sub/shared-recipes/index?shareId=${encodeURIComponent(shareId.value)}`
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
watch(() => props.active, (active) => { if (active && !loaded.value) void load() }, { immediate: true })
defineExpose({
  refresh: load,
  getSharePayload: () => {
    const user = getCurrentUser()
    return { title: `${user.name} 的食谱`, path: `/pages-sub/shared-recipes/index?shareId=${encodeURIComponent(shareId.value)}` }
  }
})
</script>

<template>
  <view class="page-shell my-page">

    <!-- 背景图区域：占据顶部 ~540rpx，跟着外层滚动被 sheet 盖住。
         内容顺序：image 主体 → fade 蒙版（顶部更白让 header 文字清晰；底部略白让 sheet 自然过渡）→ handle 提示 -->
    <view class="recipe-backdrop">
      <image class="recipe-backdrop-img" :src="recipeBackdropSrc" mode="aspectFill" />
    </view>

    <!-- 列表 sheet：跟随外层滚动；自身高度 = 视口，外层滚到底时 backdrop 完全被本 sheet 盖住。
         顶部贴 36rpx 圆角 + 拉把，提示可滚动；scroll-region 由内层 scroll-view 接管列表内部滚动 -->
    <view class="recipe-sheet">
      <view class="recipe-sheet-handle" aria-hidden="true" />
      <view class="recipe-scroll-region">
        <view v-if="loading" class="empty-state">正在加载食谱...</view>
        <view v-else class="recipe-category-host">
          <!-- 顶部：标题行（标题 + 操作按钮）叠在背景图之上，跟着外层滚动；fade 蒙版给可读性 -->
          <view class="recipe-top">
            <view class="recipe-head">
              <view class="recipe-heading">
                <text class="recipe-heading-title">{{ recipeTitle }}</text>
              </view>
              <view class="header-actions">
                <view class="nav-action community-action" aria-label="打开广场" title="打开广场" @click="openCommunity">
                  <AppIcon name="community" size="sm" /><text>广场</text>
                </view>
                <view v-if="authenticated" class="recipe-actions">
                  <!-- #ifdef MP-WEIXIN --><button class="icon-action share-button" :disabled="!shareId"
                    open-type="share" aria-label="分享菜谱" title="分享菜谱">
                    <AppIcon name="share" size="sm" />
                  </button><!-- #endif -->
                  <!-- #ifdef H5 -->
                  <view class="icon-action share-button" aria-label="分享菜谱" title="分享菜谱" @click="shareRecipes">
                    <AppIcon name="share" size="sm" />
                  </view><!-- #endif -->
                  <view class="icon-action manage-button" aria-label="管理分类" title="管理分类" @click="openCategoryManager">
                    <AppIcon name="settings" size="sm" />
                  </view>
                  <view class="icon-action add-button" aria-label="新建食谱" title="新建食谱"
                    @click="uni.navigateTo({ url: '/pages-sub/recipe/edit' })">
                    <AppIcon name="plus" size="sm" />
                  </view>
                </view>
              </view>
            </view>
            <view class="recipe-filter">
              <view class="filter-copy"><text class="filter-title">显示范围</text><text class="filter-desc">{{
                includeImported
                  ? '含导入食谱' : '仅我的原创' }}</text></view>
              <switch class="scope-switch" :checked="includeImported" color="#e8542e" @change="toggleImported" />
            </view>
          </view>
          <CategorySplit class="category-fill" :categories="categoryItems" :active-category="activeCategory"
            :total="visibleRecipes.length" :total-label="`${visibleRecipes.length} 道菜`"
            :eyebrow="authenticated ? 'MY RECIPES' : 'FEATURED RECIPES'" @select="selectCategory">
            <view v-if="!visibleRecipes.length" class="empty-state">这个分类暂时没有菜品</view>
            <view v-else class="feed">
              <RecipeCard v-for="recipe in visibleRecipes" :key="recipe.id" :recipe="recipe" hide-edit hide-rating
                :readonly="!authenticated" :collected="collected[recipe.id]" @open="openRecipe"
                @toggle-collect="collect" @edit="editRecipe" />
            </view>
          </CategorySplit>
        </view>
      </view>
    </view>

    <!-- 管理分类弹窗（up-popup 底部弹层；不用 v-if，关闭时播放收起动画，custom-class 避免在 flex 布局中占位） -->
    <up-popup :show="categoryManagerOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true"
      @close="closeCategoryManager">
      <view class="category-modal">
        <view class="modal-header">
          <view><text class="modal-kicker">MY CATEGORIES</text><text class="modal-title">管理分类</text></view>
          <view class="modal-close" @click="closeCategoryManager">
            <AppIcon name="close" size="md" />
          </view>
        </view>
        <view class="category-manager-list">
          <view v-if="categoryItems.some((item) => item.name === DEFAULT_FAMILY_CATEGORY)"
            class="category-manager-item system-category">
            <view><text class="manager-name">{{ DEFAULT_FAMILY_CATEGORY }}</text><text class="manager-count">{{
              categoryItems.find((item) => item.name === DEFAULT_FAMILY_CATEGORY)?.count || 0}} 道菜 · 系统分类</text>
            </view>
          </view>
          <view v-for="category in userCategories" :key="category.id" class="category-manager-item">
            <view><text class="manager-name">{{ category.name }}</text><text class="manager-count">{{
              categoryItems.find((item) => item.name === category.name)?.count || 0}} 道菜</text></view>
            <view class="manager-actions"><text class="manager-action"
                @click="openCategoryForm(category)">编辑</text><text class="manager-action danger"
                @click="removeCategory(category)">删除</text></view>
          </view>
        </view>
        <button class="primary-button category-add-button" @click="openCategoryForm()">
          <AppIcon name="plus" size="sm" /> 新增分类
        </button>
      </view>
    </up-popup>
    <!-- 分类表单弹窗（up-popup 居中；不用 v-if，关闭时播放收起动画，custom-class 避免在 flex 布局中占位） -->
    <up-popup :show="categoryFormOpen" custom-class="popup-static" mode="center" @close="closeCategoryForm">
      <view class="category-form-modal">
        <text class="modal-title">{{ categoryFormTitle }}</text>
        <input v-model="categoryDraft" class="category-input" maxlength="30"
          :placeholder="editingCategory ? '输入新的分类名称' : '例如：周末大餐'" focus />
        <view class="form-actions"><button class="secondary-button" @click="closeCategoryForm">取消</button><button
            class="primary-button" :loading="categorySaving" @click="saveCategory">保存</button></view>
      </view>
    </up-popup>
  </view>
</template>

<style scoped>
/*
 * 布局与滚动协同：
 * 1. 外层 pages/index/index.vue 给所有 tab 提供 <scroll-view class="tab-scroll"> 作为外层滚动容器。
 *    这里去掉 my-page 的固定高度（改 min-height），让组件总高 ≈ backdrop (40vh) + sheet (≥ 60vh)，
 *    外层 scroll-view 才能接管整页滚动。
 * 2. backdrop 跟着外层滚动；当用户从右栏列表手势上滑时，内层 scroll-view 在顶部会
 *    把滚动事件冒泡到外层 → 整个 backdrop + sheet 一起上移 → sheet 逐渐盖住 backdrop。
 *    当 backdrop 滚出可视区后，再继续滑动由右栏内层 scroll-view 接管列表内部滚动。
 * 3. sheet height 给到至少 60vh，保证右栏能放下完整列表分类而不被截掉。
 */
.my-page {
  /* 覆盖全局 .page-shell 的 padding：让 backdrop 紧贴状态栏下方，sheet 紧贴底部 */
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  box-sizing: border-box;
  background: #fdf8f2;
}

/* 顶部背景图区：相对定位，固定高度，让 image 子元素 absolute 铺满。
   主视觉策略：backdrop 高度 = 540rpx (iPhone 14 Pro 上 ~38% 视口)，
   顶部 fade 蒙版给 header/filter 文字提供可读性，底部接 sheet */
.recipe-backdrop {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  height: 340rpx;
  overflow: hidden;
}

.recipe-backdrop-img {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* AI 生成的图右下角有 AI 水印；用 background 占位色 + image aspectFill 蒙版覆盖。
     image 的 mode="aspectFill" 默认主体居中，但底部 8% 高度的水印仍在。
     这里再叠一层 fade 蒙版把它涂掉。 */
  background: #f3e3cf;
}

.recipe-backdrop-fade {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 100%;
  background:
    linear-gradient(180deg,
      rgba(253, 248, 242, 0.94) 0%,
      rgba(253, 248, 242, 0.55) 16%,
      rgba(253, 248, 242, 0.18) 38%,
      rgba(253, 248, 242, 0.12) 62%,
      rgba(253, 248, 242, 0.55) 86%,
      rgba(253, 248, 242, 0.96) 100%);
  pointer-events: none;
}

.recipe-top {
  padding: 0 12rpx 0;
}

.recipe-backdrop-handle {
  position: absolute;
  bottom: 28rpx;
  left: 50%;
  width: 80rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 2rpx 6rpx rgba(86, 61, 43, 0.1);
  transform: translateX(-50%);
  pointer-events: none;
}

/* 列表 sheet：浮在背景图之下，覆盖 backdrop 下半部分；
   min-height 设到视口高度，确保外层 scroll-view 滚到底时整张 backdrop 被完全推出
   （外层 scrollTop = 总高 - 视口 ≈ backdrop 高度，刚好盖住背景图）。 */
.recipe-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: calc(100% + 2rpx);
  height: calc(100vh - var(--safe-top) - var(--capsule-h, 0px));
  margin-top: -36rpx;
  padding: 0 2rpx;
  background: #fdf8f2;
  border-radius: 36rpx 36rpx 0 0;
  box-shadow: 0 -8rpx 24rpx rgba(86, 61, 43, .08);
  box-sizing: border-box;
}

.recipe-sheet-handle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 22rpx;
  padding: 14rpx 0 8rpx;
  box-sizing: border-box;
}

.recipe-sheet-handle::after {
  content: '';
  width: 100rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #e0cdb8;
}

.recipe-scroll-region {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0 18rpx;
  box-sizing: border-box;
}

.recipe-category-host {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  margin-bottom: 18rpx;
  overflow: hidden;
  box-sizing: border-box;
}

/* CategorySplit 在 .recipe-category-host（flex row）里处于主轴，子项不会被
   align-items:stretch 拉伸 → 宿主默认内容宽，组件内 .category-layout 的 width:100%
   锚定"内容宽的宿主"而收缩。class 打在宿主节点上，父作用域样式直接生效。 */
.category-fill {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.recipe-scroll-region>.empty-state,
.recipe-scroll-region>.auth-required {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

}

.recipe-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 4rpx 0;
}

.recipe-heading {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  margin-right: 0;
  padding: 0;
}

.recipe-heading-title {
  overflow: hidden;
  color: #33261e;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 46rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8rpx;
}

.recipe-actions {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding-left: 8rpx;
  border-left: 1rpx solid #eee1d6;
}

.nav-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 48rpx;
  gap: 5rpx;
  border-radius: 12rpx;
  box-sizing: border-box;
  color: #47745f;
  font-size: 19rpx;
  transition: background .15s ease, color .15s ease, transform .15s ease;
}

.community-action {
  background: #f1f8f2;
}

.nav-action:active {
  background: rgba(232, 84, 46, .08);
  color: #e8542e;
  transform: scale(.96);
}

.eyebrow,
.results-eyebrow {
  color: #8c9f94;
  font-size: 19rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.icon-action {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50rpx;
  height: 50rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 13rpx;
  line-height: 1;
  box-sizing: border-box;
}

.icon-action:active {
  opacity: .72;
  transform: scale(.96);
}

.share-button {
  border: 1rpx solid #f3d8c7;
  background: #fff8f3;
  color: #b36f4c;
}

.manage-button {
  border: 1rpx solid #d8e8dd;
  background: #f5faf6;
  color: #36715e;
}

.add-button {
  background: linear-gradient(135deg, #ff8a3d, #e8542e);
  color: #fff;
}

.recipe-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-top: 12rpx;
  padding: 12rpx 6rpx 6rpx;
  border-top: 1rpx solid rgba(110, 80, 60, 0.10);
}

.filter-copy {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.filter-title {
  color: #6f5f54;
  font-size: 21rpx;
  font-weight: 600;
}

.filter-desc {
  color: #a29388;
  font-size: 17rpx;
}

/* switch 默认尺寸偏大，整体缩小以免在窄行里占位过高 */
.scope-switch {
  transform: scale(0.82);
  transform-origin: right center;
}

.recipe-stats {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 16rpx;
  padding: 20rpx 22rpx;
  border: 1rpx solid #eee3d8;
  border-radius: 20rpx;
  background: #fff9f3;
}

.recipe-stat-number,
.recipe-stat-label {
  display: block;
}

.recipe-stat-number {
  color: #7a573f;
  font-size: 31rpx;
  font-weight: 800;
}

.recipe-stat-label {
  margin-top: 4rpx;
  color: #ad8b74;
  font-size: 18rpx;
}

.recipe-stat-divider {
  width: 1rpx;
  height: 45rpx;
  background: #ecd9ca;
}

.recipe-stat-tip {
  margin-left: auto;
  color: #ae8366;
  font-size: 18rpx;
  line-height: 1.45;
  text-align: right;
}

:deep(.category-layout) {
  margin-top: 4rpx;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.auth-required {
  margin-top: 28rpx;
  padding: 72rpx 32rpx;
  text-align: center;
}

.auth-required-title,
.auth-required-desc {
  display: block;
}

.auth-required-title {
  color: #263a32;
  font-size: 30rpx;
  font-weight: 700;
}

.auth-required-desc {
  margin-top: 14rpx;
  color: #899189;
  font-size: 23rpx;
}

.auth-required-button {
  width: 280rpx;
  margin: 32rpx auto 0;
}

.category-modal {
  width: 100%;
  max-height: 82vh;
  padding: 30rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  overflow-y: auto;
  border-radius: 48rpx 48rpx 0 0;
  background: #fff;
  box-sizing: border-box;
}

.category-form-modal {
  width: 600rpx;
  padding: 32rpx 28rpx;
  border-radius: 48rpx;
  background: #fff;
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-kicker {
  display: block;
  color: #9a8c72;
  font-size: 18rpx;
  letter-spacing: 2rpx;
}

.modal-title {
  display: block;
  margin-top: 10rpx;
  color: #21342e;
  font-size: 34rpx;
  font-weight: 750;
}

.modal-close {
  color: #899189;
  font-size: 48rpx;
  line-height: 34rpx;
}

.category-manager-list {
  margin-top: 26rpx;
}

.category-manager-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 82rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #edf1eb;
}

.system-category {
  color: #899189;
}

.manager-name,
.manager-count {
  display: block;
}

.manager-name {
  color: #263a32;
  font-size: 26rpx;
  font-weight: 600;
}

.manager-count {
  margin-top: 6rpx;
  color: #9aa59b;
  font-size: 20rpx;
}

.manager-actions {
  display: flex;
  gap: 24rpx;
}

.manager-action {
  color: #c93d20;
  font-size: 23rpx;
}

.manager-action.danger {
  color: #b64f45;
}

.category-add-button {
  width: 100%;
  margin-top: 24rpx;
}

.category-input {
  width: 100%;
  height: 82rpx;
  margin-top: 24rpx;
  padding: 0 20rpx;
  border: 1rpx solid #e1e9df;
  border-radius: 14rpx;
  background: #f7f9f5;
  color: #263a32;
  font-size: 26rpx;
  line-height: 82rpx;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}

.form-actions button {
  flex: 1;
  height: 78rpx;
  line-height: 78rpx;
}

@media (max-width: 700px) {
  .my-page {
    padding-top: 20rpx;
  }

  .header-row {
    justify-content: space-between;
  }

  .header-actions {
    justify-content: flex-end;
    flex-shrink: 0;
    width: auto;
    box-sizing: border-box;
  }

  .header-actions,
  .recipe-actions {
    gap: 6rpx;
  }

  .icon-action {
    width: 48rpx;
    height: 48rpx;
    border-radius: 12rpx;
  }

  .nav-action {
    width: 78rpx;
    height: 46rpx;
  }

  .recipe-actions {
    padding-left: 6rpx;
  }

  .recipe-heading-title {
    font-size: 40rpx;
  }
}
</style>

<style scoped>
.my-page {
  padding-top: 24rpx;
}

.eyebrow,
.results-eyebrow {
  color: #c93d20;
}

.nav-action {
  color: #b8a99c;
}

.nav-action:active {
  background: rgba(232, 84, 46, .08);
  color: #e8542e;
}

.icon-action {
  border-color: #f0e3d6;
  background: #fff;
  color: #6f5f54;
  line-height: 1;
  box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .05);
}

/* 纯图标按钮：图标作为 inline-flex 子项会被按 inline 基线对齐而偏下，
   这里强制块级 flex 充满按钮并由 flex 居中，消除竖直偏移（仅作用于本页图标按钮） */
.icon-action :deep(.app-icon) {
  display: flex;
  width: 100%;
  height: 100%;
  color: currentColor;
}

.icon-action.add-button {
  border-color: transparent;
  background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%);
  color: #fff;
  box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .26);
}

.recipe-stats {
  border-color: #f0d9c9;
  background: linear-gradient(110deg, #fff6ee, #fdf0e4);
}

.recipe-stat-number {
  color: #e8542e;
}

.recipe-stat-label {
  color: #a29388;
}

.recipe-stat-divider {
  background: #f0d9c9;
}

.recipe-stat-tip {
  color: #b8862f;
}

.auth-required {
  border-color: #f0e3d6;
}

.auth-required-title {
  color: #33261e;
}

.auth-required-desc {
  color: #a29388;
}

:deep(.category-layout) {
  border-color: #f0e3d6;
  box-shadow: 0 16rpx 38rpx rgba(232, 84, 46, .06);
}

:deep(.category-results) {
  background: #fff;
}

:deep(.results-title) {
  color: #33261e;
  font-family: Georgia, 'Songti SC', serif;
}

:deep(.results-count) {
  color: #b8862f;
}

:deep(.recipe-card) {
  border-color: #f0e3d6;
  box-shadow: 0 14rpx 30rpx rgba(232, 84, 46, .06);
}

:deep(.recipe-title) {
  color: #33261e;
}

:deep(.recipe-subtitle),
:deep(.recipe-meta) {
  color: #a29388;
}

:deep(.collect),
:deep(.edit) {
  background: #fdeee7;
  color: #c93d20;
}

:deep(.rating) {
  color: #e9a13b;
}

:deep(.tag) {
  background: #fdf3e0;
  color: #b8862f;
}

.category-modal,
.category-form-modal {
  border: 1rpx solid #f0e3d6;
  background: #fff;
}

.modal-kicker {
  color: #b8862f;
}

.modal-title {
  color: #33261e;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  color: #a29388;
}

.category-manager-item {
  border-color: #f5e9dd;
}

.system-category,
.manager-count {
  color: #a29388;
}

.manager-name {
  color: #6f5f54;
}

.manager-action {
  color: #c93d20;
}

.manager-action.danger {
  color: #b64f45;
}

.category-add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%);
  box-shadow: 0 10rpx 22rpx rgba(232, 84, 46, .24);
}

.category-input {
  border-color: #f0e3d6;
  background: #fff;
  color: #33261e;
}
</style>
