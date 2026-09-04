<script setup lang="ts">
import { onLoad, onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import PlanPicker from '@/components/PlanPicker.vue'
import PageHeader from '@/components/PageHeader.vue'
import { addRecipeToMenu, formatDate } from '@/services/menu'
import { fetchMyRecipeCategories, fetchRecipeDetails, fetchSharedRecipe, importCommunityRecipe } from '@/services/recipe'
import { formatIngredientAmount } from '@/services/ingredient-matching'
import { withLoginRequired } from '@/services/auth-guard'
import { getCurrentUser } from '@/services/storage'
import { useRecipeStore } from '@/stores/recipe'
import type { MealType, Recipe } from '@/types'

const recipe = ref<Recipe>()
const collected = ref(false)
const date = ref(formatDate())
const showPlanPicker = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const shareId = ref('')
const recipeStore = useRecipeStore()
const user = getCurrentUser()
const sharedView = computed(() => Boolean(shareId.value))
const canCollect = computed(() => Boolean(recipe.value && recipe.value.authorId !== user.id && !sharedView.value))
const canEdit = computed(() => Boolean(recipe.value && recipe.value.authorId === user.id && !sharedView.value))
const hasRating = computed(() => Boolean(recipe.value?.ratingCount))
const totalIngredientText = computed(() => recipe.value?.servings ? `${recipe.value.ingredients.length} 种食材 · ${recipe.value.servings} 人份` : `${recipe.value?.ingredients.length || 0} 种食材`)
const stepImages = (step: Recipe['steps'][number]) => step.images?.length ? step.images : step.image ? [step.image] : []

onLoad(async (options) => {
  if (!options?.id) return
  shareId.value = String(options.shareId || '')
  try {
    if (shareId.value) {
      recipe.value = await fetchSharedRecipe(shareId.value, options.id)
    } else {
      recipe.value = await fetchRecipeDetails(options.id)
    }
  } catch (error) {
    console.error('[recipe-detail] load failed', error)
  }
})
onShow(() => { if (recipe.value?.isImported) collected.value = true })
onShareAppMessage(() => ({ title: recipe.value?.title || '分享一道好菜', path: `/pages-sub/recipe/detail?id=${recipe.value?.id}${shareId.value ? `&shareId=${encodeURIComponent(shareId.value)}` : ''}` }))

const collect = withLoginRequired(async () => {
  if (!recipe.value || !canCollect.value) return
  try {
    const categories = (await fetchMyRecipeCategories()).filter((category) => category.name !== '未分类')
    const categoryNames = [...categories.map((category) => category.name), '未分类']
    uni.showActionSheet({ itemList: categoryNames, success: async ({ tapIndex }) => {
      try {
        const imported = await importCommunityRecipe(recipe.value!.id, categoryNames[tapIndex] === '未分类' ? undefined : categoryNames[tapIndex])
        recipe.value = imported
        collected.value = true
        uni.showToast({ title: '已加入我的食谱', icon: 'success' })
      } catch {
        uni.showToast({ title: '加入失败，请检查服务器连接', icon: 'none' })
      }
    } })
  } catch {
    uni.showToast({ title: '分类加载失败，请先登录', icon: 'none' })
  }
})
const removeRecipe = () => {
  if (!recipe.value || !canEdit.value || deleting.value) return
  showDeleteConfirm.value = true
}
const closeDeleteConfirm = () => {
  if (deleting.value) return
  showDeleteConfirm.value = false
}
const confirmRemoveRecipe = async () => {
  if (!recipe.value || !canEdit.value || deleting.value) return
  deleting.value = true
  try {
    await recipeStore.remove(recipe.value.id)
    showDeleteConfirm.value = false
    uni.showToast({ title: '已删除食谱', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (error) {
    console.error('[recipe-detail] delete failed', error)
    uni.showToast({ title: '删除失败，请检查服务器连接', icon: 'none' })
  } finally {
    deleting.value = false
  }
}
const addMenu = withLoginRequired(async (planDate: string, meals: MealType[]) => {
  if (!recipe.value) return
  if (planDate < formatDate()) return uni.showToast({ title: '不能加入今天之前的计划', icon: 'none' })
  try {
    await Promise.all(meals.map((meal) => addRecipeToMenu(planDate, recipe.value!.id, meal)))
    showPlanPicker.value = false
    uni.showToast({ title: `已安排 ${meals.length} 餐`, icon: 'none' })
  } catch { uni.showToast({ title: '加入计划失败，请检查服务连接', icon: 'none' }) }
})
const openPlanPicker = withLoginRequired(() => { showPlanPicker.value = true })
const startCooking = withLoginRequired(() => {
  if (!recipe.value) return
  uni.navigateTo({ url: `/pages-sub/cook/index?id=${recipe.value.id}` })
})
</script>

<template>
  <view class="detail-page">
    <PageHeader title="食谱详情" />
    <template v-if="recipe">
      <image class="detail-cover" :src="recipe.cover" mode="aspectFill" />
      <view class="detail-content page-shell">
      <view class="detail-title-row"><view><text class="detail-title">{{ recipe.title }}</text><text class="detail-subtitle">{{ recipe.subtitle }}</text></view><view v-if="canEdit" class="owner-actions"><text class="edit-button" @click="uni.navigateTo({ url: `/pages-sub/recipe/edit?id=${recipe.id}` })">编辑</text><text class="delete-button" @click="removeRecipe">{{ deleting ? '删除中' : '删除' }}</text></view><text v-else-if="canCollect" class="collect-button" @click="collect">{{ collected ? '已加入' : '加入我的食谱' }}</text></view>
      <view class="author-row"><image :src="recipe.authorAvatar" mode="aspectFill" /><view><text class="author-name">{{ recipe.authorName }}</text><text class="author-source">{{ recipe.isImported ? `来自广场 · ${recipe.originAuthorName || '用户分享'}` : recipe.source === 'official' ? '官方精选' : recipe.source === 'douguo' ? '豆果菜谱' : recipe.source === 'community' ? '广场食谱' : '用户分享' }}</text></view><view class="rating-block"><text v-if="hasRating">★ {{ recipe.rating }}</text><text v-else class="rating-empty">暂无评分</text><text>{{ hasRating ? `${recipe.ratingCount} 人评价` : '还没有评价' }}</text></view></view>
      <view v-if="recipe.duration || recipe.difficulty || recipe.servings" class="meta-grid"><view v-if="recipe.duration"><text>{{ recipe.duration }}</text><text>分钟</text></view><view v-if="recipe.difficulty"><text>{{ recipe.difficulty }}</text><text>难度</text></view><view v-if="recipe.servings"><text>{{ recipe.servings }}</text><text>人份</text></view></view>
      <view v-if="recipe.process" class="recipe-process"><text class="recipe-process-label">制作工艺</text><text>{{ recipe.process }}</text></view>
      <view class="tag-row"><text v-for="tag in recipe.tags" :key="tag" class="pill">{{ tag }}</text></view>
      <view class="content-section"><view class="section-row"><text class="section-title">食材清单</text><text class="caption">{{ recipe.flavor }}口味</text></view><view class="ingredient-list"><view v-for="ingredient in recipe.ingredients" :key="ingredient.id" class="ingredient"><text>{{ ingredient.name }}</text><text>{{ formatIngredientAmount(ingredient.amount) }}</text></view></view></view>
      <view class="content-section"><view class="section-row"><text class="section-title">制作步骤</text><text class="caption">{{ recipe.steps.length }} 步</text></view><view class="step-preview"><view v-for="(step, index) in recipe.steps" :key="step.id" class="preview-row"><text class="preview-index">0{{ index + 1 }}</text><view class="preview-copy"><text class="preview-title">{{ step.title }}</text><text class="preview-desc">{{ step.description }}</text><view v-if="stepImages(step).length" class="preview-images"><image v-for="image in stepImages(step)" :key="image" :src="image" mode="aspectFill" /></view></view></view></view></view>
      <view v-if="!sharedView" class="bottom-actions"><button class="plan-button" @click="openPlanPicker">加入计划</button><button class="primary-button" @click="startCooking">开始烹饪</button></view>
      </view>
      <PlanPicker :open="showPlanPicker" :recipe-title="recipe.title" :initial-date="date" @close="showPlanPicker = false" @confirm="addMenu" />
      <view v-if="showDeleteConfirm" class="delete-modal-mask" @click="closeDeleteConfirm">
        <view class="delete-modal" @click.stop>
          <view class="delete-modal-icon"><AppIcon name="trash" size="lg" /></view>
          <text class="delete-modal-kicker">DELETE RECIPE</text>
          <text class="delete-modal-title">确定删除这道食谱吗？</text>
          <text class="delete-modal-desc">「{{ recipe.title }}」删除后将无法恢复。</text>
          <view class="delete-modal-actions">
            <button class="delete-cancel" @click="closeDeleteConfirm">取消</button>
            <button class="delete-confirm" :loading="deleting" @click="confirmRemoveRecipe">删除食谱</button>
          </view>
        </view>
      </view>
    </template>
    <view v-else class="empty-state">食谱加载中…</view>
  </view>
</template>

<style scoped>
.detail-page { min-height: 100vh; background: #f7f8f3; }
.detail-cover { display: block; width: 100%; height: 450rpx; background: #f7ede3; }
.detail-content { padding-top: 36rpx; padding-bottom: 156rpx; }
.detail-title-row { display: flex; justify-content: space-between; gap: 20rpx; }
.detail-title { display: block; color: #33261e; font-size: 48rpx; font-weight: 700; }
.detail-subtitle { display: block; margin-top: 12rpx; color: #a29388; font-size: 25rpx; }
.collect-button { flex-shrink: 0; color: #c93d20; font-size: 24rpx; }
.edit-button { flex-shrink: 0; color: #c93d20; font-size: 24rpx; }
.owner-actions { display: flex; flex-shrink: 0; align-items: center; gap: 20rpx; }
.delete-button { color: #b64f45; font-size: 24rpx; }
.delete-modal-mask { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 48rpx; background: rgba(48, 34, 25, .46); }
.delete-modal { width: 100%; max-width: 620rpx; padding: 38rpx 32rpx 30rpx; border: 1rpx solid #f0e3d6; border-radius: 28rpx; background: #fffdfa; box-shadow: 0 24rpx 60rpx rgba(54, 35, 22, .18); text-align: center; box-sizing: border-box; }
.delete-modal-icon { display: flex; align-items: center; justify-content: center; width: 76rpx; height: 76rpx; margin: 0 auto; border-radius: 24rpx; background: #fcebe5; color: #b64f45; }
.delete-modal-kicker { display: block; margin-top: 20rpx; color: #b8862f; font-size: 17rpx; font-weight: 700; letter-spacing: 2rpx; }
.delete-modal-title { display: block; margin-top: 12rpx; color: #33261e; font-size: 34rpx; font-weight: 700; line-height: 1.35; }
.delete-modal-desc { display: block; margin-top: 12rpx; color: #a29388; font-size: 23rpx; line-height: 1.5; }
.delete-modal-actions { display: flex; gap: 14rpx; margin-top: 28rpx; }
.delete-modal-actions button { display: flex; flex: 1; align-items: center; justify-content: center; height: 78rpx; padding: 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 600; line-height: 1; }
.delete-cancel { border: 1.5rpx solid #e4d3c2; background: #fff; color: #806b5c; }
.delete-confirm { border: 1rpx solid #b64f45; background: #b64f45; color: #fff; box-shadow: 0 10rpx 22rpx rgba(182, 79, 69, .2); }
.delete-cancel:active, .delete-confirm:active { transform: scale(.98); opacity: .9; }
.author-row { display: flex; align-items: center; gap: 16rpx; margin-top: 32rpx; }
.author-row image { width: 56rpx; height: 56rpx; border-radius: 50%; }
.author-name, .author-source { display: block; }
.author-name { color: #34473f; font-size: 24rpx; font-weight: 600; }
.author-source { margin-top: 5rpx; color: #a29388; font-size: 20rpx; }
.rating-block { display: flex; flex-direction: column; align-items: flex-end; margin-left: auto; color: #e9a13b; font-size: 24rpx; }
.rating-empty { color: #a29388; }
.rating-block text:last-child { margin-top: 5rpx; color: #a29388; font-size: 20rpx; }
.meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 30rpx; padding: 24rpx 0; border-top: 1rpx solid #e8ece6; border-bottom: 1rpx solid #e8ece6; }
.meta-grid view { display: flex; flex-direction: column; align-items: center; gap: 6rpx; color: #c93d20; }
.meta-grid text:first-child { font-size: 27rpx; font-weight: 700; }
.meta-grid text:last-child { color: #a29388; font-size: 21rpx; }
.recipe-process { display: flex; align-items: center; gap: 16rpx; margin-top: 22rpx; color: #34473f; font-size: 24rpx; }
.recipe-process-label { color: #a29388; font-size: 21rpx; }
.tag-row { display: flex; gap: 10rpx; margin-top: 22rpx; }
.content-section { margin-top: 48rpx; }
.ingredient-list { margin-top: 20rpx; padding: 0 24rpx; background: #fff; border-radius: 18rpx; }
.ingredient { display: flex; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid #f5e9dd; color: #34473f; font-size: 25rpx; }
.ingredient:last-child { border-bottom: 0; }
.ingredient text:last-child { color: #a29388; }
.step-preview { margin-top: 20rpx; }
.preview-row { display: flex; gap: 22rpx; padding: 20rpx 0; }
.preview-index { color: #e9a13b; font-size: 24rpx; font-weight: 700; }
.preview-title, .preview-desc { display: block; }
.preview-copy { flex: 1; min-width: 0; }
.preview-title { color: #34473f; font-size: 27rpx; font-weight: 600; }
.preview-desc { margin-top: 7rpx; color: #a29388; font-size: 23rpx; line-height: 1.5; }
.preview-images { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.preview-images image { width: 190rpx; height: 150rpx; border-radius: 12rpx; background: #f7ede3; }
.bottom-actions { position: fixed; right: 0; bottom: 0; left: 0; display: flex; gap: 18rpx; padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom)); background: rgba(247,248,243,.95); }
/* 两个按钮尺寸完全统一（同高 / 同胶囊圆角 / 同字号 / 同为 flex 居中），
   仅用「渐变填充 vs 描边」区分主次。
   居中统一走 flex：plan-button 有 1.5rpx 描边，靠 line-height 居中会偏低约 1.5rpx。 */
.bottom-actions button { display: flex; flex: 1; align-items: center; justify-content: center; height: 88rpx; line-height: 1; border-radius: 999rpx; font-size: 28rpx; font-weight: 600; }
.plan-button { border: 1.5rpx solid #e4d3c2; background: #fff; color: #c93d20; }
</style>
