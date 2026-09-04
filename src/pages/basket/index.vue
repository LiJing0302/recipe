<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import InventoryBatchForm, { type InventoryBatchDraft } from '@/components/InventoryBatchForm.vue'
import { getIngredientCategory, INGREDIENT_CATALOG, INGREDIENT_CATEGORIES } from '@/constants/ingredients'
import { formatIngredientAmount, getIngredientKey } from '@/services/ingredient-matching'
import { formatDate } from '@/services/menu'
import { withLoginRequired } from '@/services/auth-guard'
import { useAppStore } from '@/stores/app'
import { useBasketStore } from '@/stores/basket'
import { useInventoryStore } from '@/stores/inventory'
import type { BasketPendingItem, IngredientInventoryBatch } from '@/types'

const props = defineProps<{ active: boolean }>()
const appStore = useAppStore()
const basketStore = useBasketStore()
const inventoryStore = useInventoryStore()

const pendingItems = computed(() => basketStore.items)
const todayBatches = computed(() => inventoryStore.batchesForDate(formatDate()))
const formOpen = ref(false)
const viewMode = ref<'ingredient' | 'recipe'>('recipe')
type PendingIngredientGroup = {
  key: string
  name: string
  displayAmount: string
  available: boolean
  items: BasketPendingItem[]
  recipes: string[]
}
type PendingRecipeGroup = {
  key: string
  title: string
  cover: string
  pendingItems: BasketPendingItem[]
  purchasedBatches: IngredientInventoryBatch[]
}
type PurchasedIngredientGroup = {
  key: string
  name: string
  batches: IngredientInventoryBatch[]
}
const purchaseGroup = ref<PendingIngredientGroup>()

const getBasketIngredientCategory = (name: string, ingredientKey?: string) => {
  const key = ingredientKey || getIngredientKey(name)
  const mappedIngredient = INGREDIENT_CATALOG.find((item) => getIngredientKey(item.name) === key)
  return mappedIngredient?.category || getIngredientCategory(name)
}

const pendingGroups = computed(() => {
  const groups = new Map<string, PendingIngredientGroup>()
  pendingItems.value.forEach((item) => {
    const amount = item.amount
    const ingredientKey = item.ingredientKey || getIngredientKey(item.ingredientName)
    const key = ingredientKey
    const group = groups.get(key) || { key: ingredientKey, name: item.ingredientName, displayAmount: '', available: false, items: [], recipes: [] }
    group.displayAmount = group.displayAmount ? `${group.displayAmount}、${formatIngredientAmount(amount)}` : formatIngredientAmount(amount)
    group.items.push(item)
    if (!group.recipes.includes(item.recipeTitle)) group.recipes.push(item.recipeTitle)
    groups.set(key, group)
  })
  groups.forEach((group) => {
    group.available = inventoryStore.hasUsableIngredient({ name: group.name, ingredientKey: group.key })
  })
  return [...groups.values()]
})

const purchasedGroups = computed<PurchasedIngredientGroup[]>(() => {
  const groups = new Map<string, PurchasedIngredientGroup>()
  todayBatches.value.forEach((batch) => {
    const key = batch.ingredientKey || getIngredientKey(batch.name)
    const group = groups.get(key) || { key, name: batch.name, batches: [] }
    group.batches.push(batch)
    groups.set(key, group)
  })
  return [...groups.values()]
})

const pendingRecipeGroups = computed<PendingRecipeGroup[]>(() => {
  const groups = new Map<string, PendingRecipeGroup>()
  pendingItems.value.forEach((item) => {
    const group = groups.get(item.recipeId) || { key: item.recipeId, title: item.recipeTitle, cover: item.recipeCover, pendingItems: [], purchasedBatches: [] }
    group.pendingItems.push(item)
    groups.set(item.recipeId, group)
  })
  todayBatches.value.forEach((batch) => {
    const key = batch.recipeId || 'manual'
    const group = groups.get(key) || { key, title: batch.recipeTitle || '今日购入', cover: '', pendingItems: [], purchasedBatches: [] }
    group.purchasedBatches.push(batch)
    groups.set(key, group)
  })
  return [...groups.values()]
})

const pendingCategoryGroups = computed(() => {
  const counts = new Map<string, number>()
  pendingGroups.value.forEach((group) => {
    const category = getBasketIngredientCategory(group.name, group.key)
    counts.set(category, (counts.get(category) || 0) + 1)
  })
  return INGREDIENT_CATEGORIES
    .filter((category) => counts.has(category))
    .map((category) => ({ name: category, count: counts.get(category) || 0 }))
})
const hasVisibleItems = computed(() => viewMode.value === 'ingredient' ? pendingGroups.value.length > 0 || purchasedGroups.value.length > 0 : pendingRecipeGroups.value.length > 0)
const pendingFormBatch = computed<IngredientInventoryBatch | undefined>(() => {
  if (!purchaseGroup.value) return undefined
  const group = purchaseGroup.value
  return {
    id: '', userId: '', name: group.name, normalizedName: '', category: getBasketIngredientCategory(group.name, group.key),
    purchasedAt: formatDate(), sourceType: 'recipe', recipeId: group.items[0].recipeId, recipeTitle: group.recipes.join('、'),
    basketItemId: group.items[0].id, ingredientKey: group.key, storageMode: 'chilled', createdAt: ''
  }
})

const purchaseItem = (item: BasketPendingItem) => openPurchaseForm({
  key: item.ingredientKey || getIngredientKey(item.ingredientName),
  name: item.ingredientName,
  displayAmount: formatIngredientAmount(item.amount),
  available: false,
  items: [item],
  recipes: [item.recipeTitle]
})

const openManualForm = withLoginRequired(() => { purchaseGroup.value = undefined; formOpen.value = true })
const openPurchaseForm = withLoginRequired((group: PendingIngredientGroup) => {
  purchaseGroup.value = group
  formOpen.value = true
})
const closeForm = () => { formOpen.value = false; purchaseGroup.value = undefined }
const saveForm = async (draft: InventoryBatchDraft) => {
  const isPurchase = Boolean(purchaseGroup.value)
  try {
    if (purchaseGroup.value) {
      await basketStore.purchaseItems(purchaseGroup.value.items.map((item) => item.id), {
        category: draft.category,
        purchasedAt: draft.purchasedAt,
        storageMode: draft.storageMode,
        ingredientKey: purchaseGroup.value.key
      })
    } else {
      await inventoryStore.addBatch({ ...draft, sourceType: 'manual' })
    }
    closeForm(); uni.showToast({ title: isPurchase ? '已采购并加入食材库' : '已加入今日已采购', icon: 'success' })
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '保存失败，请检查服务连接', icon: 'none' }) }
}
const removePending = (id: string) => {
  uni.showModal({
    title: '移除待采购项', content: '移除后不会再出现在菜篮子中。', confirmColor: '#b64f45', success: (result) => {
      if (!result.confirm) return
      basketStore.removeItem(id).then(() => uni.showToast({ title: '已移除', icon: 'none' })).catch((error) => uni.showToast({ title: error instanceof Error ? error.message : '移除失败', icon: 'none' }))
    }
  })
}
const removeGroup = (group: PendingIngredientGroup) => {
  uni.showModal({
    title: '移除待采购项', content: `移除 ${group.name} 后不会再出现在菜篮子中。`, confirmColor: '#b64f45', success: (result) => {
      if (!result.confirm) return
      basketStore.removeItems(group.items.map((item) => item.id)).then(() => uni.showToast({ title: '已移除', icon: 'none' })).catch((error) => uni.showToast({ title: error instanceof Error ? error.message : '移除失败', icon: 'none' }))
    }
  })
}
const sourceLabel = (batch: IngredientInventoryBatch) => batch.sourceType === 'recipe' ? `来自：${batch.recipeTitle || '菜谱'}` : '今日购入'
watch(() => props.active, (active) => {
  // 菜篮子待采购项由 Basket Store 管理，切换 Tab 不重复请求菜篮子或库存接口。
  // 极端情况下 Store 尚未初始化时，只走一次非强制 load。
  if (active && appStore.authenticated && !inventoryStore.loaded) void inventoryStore.load().catch(() => undefined)
}, { immediate: true })
watch(() => appStore.sessionVersion, () => {
  // 登录、退出或登录失效时，清理页面自己的库存展示和弹窗状态。
  purchaseGroup.value = undefined
  formOpen.value = false
  viewMode.value = 'recipe'
  if (appStore.authenticated && props.active && !inventoryStore.loaded) void inventoryStore.load().catch(() => undefined)
})
// 不暴露 refresh：根页面 onShow 和 Tab 聚焦不会再次请求菜篮子接口。
defineExpose({ openManualForm })
</script>

<template>
  <view class="basket-page page-shell">
    <view class="page-intro basket-intro">
      <view class="intro-copy"><text class="eyebrow">GROCERY BASKET</text><text class="page-title">菜篮子</text><text
          class="page-desc">把要买的和刚买到的，放在一起看清楚</text></view>
    </view>
    <view class="view-switch" role="tablist">
      <button class="view-switch-item" :class="{ active: viewMode === 'recipe' }"
        @click="viewMode = 'recipe'">按菜谱</button>
      <button class="view-switch-item" :class="{ active: viewMode === 'ingredient' }"
        @click="viewMode = 'ingredient'">按食材</button>
    </view>
    <view v-if="viewMode === 'ingredient' && pendingGroups.length" class="content-section">
      <view class="section-row"><text class="section-title">待采购</text></view>
      <view v-for="group in pendingGroups" :key="group.key" class="pending-group surface">
        <view class="recipe-row">
          <view class="recipe-copy"><text class="recipe-title">{{ group.name }}</text><text class="recipe-meta">来自：{{
            group.recipes.join('、') }}</text></view>
        </view>
        <view class="pending-item">
          <view class="ingredient-copy"><text class="ingredient-name">食谱用量：{{ group.displayAmount }}</text><text
              class="ingredient-amount" :class="group.available ? '' : 'inventory-check-warning'">{{ group.available ?
                '食材库已有，可按需决定是否补购' : '食材库未记录，建议购买' }}</text></view>
          <view class="pending-actions"><text class="remove" @click="removeGroup(group)">移除</text><button
              class="purchase-button" @click="openPurchaseForm(group)">已采购</button></view>
        </view>
      </view>
    </view>

    <view v-if="viewMode === 'ingredient' && purchasedGroups.length" class="content-section">
      <view class="section-row"><text class="section-title">已采购</text><text class="caption">按食材整理 · 今日已购入</text></view>
      <view v-for="group in purchasedGroups" :key="group.key" class="pending-group surface">
        <view class="recipe-row">
          <view class="recipe-copy"><text class="recipe-title">{{ group.name }}</text><text class="recipe-meta">今日已购入 {{ group.batches.length }} 个批次</text></view>
        </view>
        <view v-for="batch in group.batches" :key="batch.id" class="pending-item purchased-item">
          <view class="purchased-mark" />
          <view class="ingredient-copy"><text class="ingredient-name">{{ batch.name }}</text><text
              class="ingredient-amount">{{ sourceLabel(batch) }} · 已记录一个批次</text></view><text
            class="purchased-status">已采购</text>
        </view>
      </view>
    </view>

    <view v-if="viewMode === 'recipe' && pendingRecipeGroups.length" class="content-section">
      <view class="section-row"><text class="section-title">待采购</text></view>
      <view v-for="group in pendingRecipeGroups" :key="group.key" class="pending-group recipe-group surface">
        <view class="recipe-row">
          <image v-if="group.cover" :src="group.cover" mode="aspectFill"
            style="display: block; width: 44px; height: 44px; object-fit: cover;" />
          <view class="recipe-copy"><text class="recipe-title">{{ group.title }}</text><text class="recipe-meta">{{
            group.pendingItems.length }} 项待采购 · {{ group.purchasedBatches.length }} 项已采购</text></view>
        </view>
        <view v-for="item in group.pendingItems" :key="item.id" class="pending-item">
          <view class="ingredient-copy"><text class="ingredient-name">{{ item.ingredientName }}</text><text
              class="ingredient-amount">食谱用量：{{ formatIngredientAmount(item.amount) }}</text></view>
          <view class="pending-actions"><text class="remove" @click="removePending(item.id)">移除</text><button
              class="purchase-button" @click="purchaseItem(item)">已采购</button></view>
        </view>
        <view v-for="batch in group.purchasedBatches" :key="batch.id" class="pending-item purchased-item">
          <view class="purchased-mark" />
          <view class="ingredient-copy"><text class="ingredient-name">{{ batch.name }}</text><text
              class="ingredient-amount">{{ sourceLabel(batch) }} · 已记录一个批次</text></view><text
            class="purchased-status">已采购</text>
        </view>
      </view>
    </view>

    <view v-if="!hasVisibleItems" class="empty-basket">
      <view class="empty-icon">
        <AppIcon name="bag" size="lg" />
      </view>
      <text class="empty-title">菜篮子还是空的</text>
      <text class="empty-desc">从菜谱加入待采购食材，或记录一笔今天刚买到的食材</text>
      <view class="empty-actions">
        <button class="primary-button" @click="openManualForm">加入菜篮子</button>
      </view>
    </view>
    <InventoryBatchForm :open="formOpen" :batch="pendingFormBatch" :title="purchaseGroup ? '确认采购' : '添加今日购入'"
      @close="closeForm" @save="saveForm" />
  </view>
</template>

<style scoped>
.basket-page {
  padding-top: var(--safe-top);
  padding-bottom:  calc(112rpx + 14rpx + env(safe-area-inset-bottom));
}

.basket-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16rpx 2rpx 26rpx;
}

.intro-copy {
  min-width: 0;
}

.eyebrow {
  display: block;
  color: #8c9f94;
  font-size: 19rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.page-title {
  display: block;
  margin-top: 12rpx;
  color: #21342e;
  font-size: 54rpx;
  font-weight: 750;
}

.page-desc {
  display: block;
  margin-top: 8rpx;
  color: #84938a;
  font-size: 23rpx;
}

.add-icon {
  font-size: 28rpx;
  line-height: 1;
}

.basket-summary {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx;
  border: 1rpx solid #d7eadf;
  border-radius: 24rpx;
  background: #eaf5ee;
}

.basket-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid #eee1d5;
  border-radius: 22rpx;
  background: linear-gradient(110deg, #fff9f2, #fcf4ec);
}

.progress-kicker {
  display: block;
  color: #b3835e;
  font-size: 17rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.progress-title {
  display: block;
  margin-top: 8rpx;
  color: #6f4c39;
  font-size: 25rpx;
  font-weight: 750;
}

.progress-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 78rpx;
  height: 78rpx;
  border: 3rpx solid #e8b38d;
  border-radius: 50%;
  color: #a66e4a;
}

.progress-ring text:first-child {
  font-size: 27rpx;
  font-weight: 800;
  line-height: 1;
}

.progress-ring text:last-child {
  margin-top: 5rpx;
  font-size: 16rpx;
}

.summary-mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62rpx;
  height: 62rpx;
  border-radius: 19rpx;
  background: #fff;
}

.summary-mark::before {
  content: '';
  position: absolute;
  width: 30rpx;
  height: 24rpx;
  border: 3rpx solid #46896f;
  border-top: 0;
  border-radius: 0 0 6rpx 6rpx;
}

.summary-mark::after {
  content: '';
  position: absolute;
  top: 15rpx;
  width: 17rpx;
  height: 11rpx;
  border: 3rpx solid #46896f;
  border-bottom: 0;
  border-radius: 10rpx 10rpx 0 0;
}

.summary-mark view {
  position: absolute;
  top: 32rpx;
  left: 20rpx;
  right: 20rpx;
  border-top: 2rpx solid #a9cdb9;
}

.summary-copy {
  flex: 1;
}

.summary-title,
.summary-caption {
  display: block;
}

.summary-title {
  color: #235a49;
  font-size: 27rpx;
  font-weight: 750;
}

.summary-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}

.summary-category {
  display: inline-flex;
  align-items: center;
  gap: 5rpx;
  padding: 5rpx 10rpx;
  border: 1rpx solid #d9e9df;
  border-radius: 999rpx;
  background: #f7fcf8;
  color: #3d6c58;
  font-size: 19rpx;
  line-height: 1.2;
  white-space: nowrap;
}

.summary-category text:last-child {
  color: #789489;
}

.summary-caption {
  margin-top: 5rpx;
  color: #789489;
  font-size: 21rpx;
}

.view-switch {
  display: flex;
  gap: 6rpx;
  margin-top: 18rpx;
  padding: 6rpx;
  border: 1rpx solid #f0e3d6;
  /* 胶囊型：外轨全圆角（实际渲染会被高度 clamp 到一半，改高度无需同步改圆角） */
  border-radius: 999rpx;
  background: #fff7f0;
}

.view-switch-item {
  flex: 1;
  height: 58rpx;
  padding: 0;
  border: 0;
  /* 胶囊滑块，与外轨同心 */
  border-radius: 999rpx;
  background: transparent;
  color: #a29388;
  font-size: 22rpx;
  line-height: 58rpx;
  transition: background-color .18s ease, color .18s ease, box-shadow .18s ease;
}

.view-switch-item::after {
  border: 0;
}

.view-switch-item.active {
  background: #fff;
  color: #c93d20;
  font-weight: 700;
  box-shadow: 0 5rpx 12rpx rgba(232, 84, 46, .1);
}

.content-section {
  margin-top: 28rpx;
}

.section-title {
  color: #213a31;
  font-size: 31rpx;
  font-weight: 750;
}

.pending-group {
  margin-top: 14rpx;
  padding: 16rpx 20rpx 8rpx;
  border-color: #e5e9e1;
  box-shadow: 0 12rpx 28rpx rgba(35, 74, 55, .045);
}

.recipe-group,
.purchased-recipe-group {
  padding-bottom: 8rpx;
}

.recipe-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding-bottom: 14rpx;
  border-bottom: 1rpx solid #edf0ea;
}

.recipe-row image {
  border-radius: 12rpx;
  background: #e8eee6;
}

.recipe-copy,
.ingredient-copy {
  flex: 1;
  min-width: 0;
}

.recipe-title,
.ingredient-name,
.ingredient-amount {
  display: block;
}

.recipe-title {
  color: #2a4037;
  font-size: 26rpx;
  font-weight: 700;
}

.recipe-meta,
.ingredient-amount {
  display: block;
  margin-top: 5rpx;
  color: #8a9990;
  font-size: 20rpx;
}

.inventory-check-warning {
  color: #b8862f;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #edf0ea;
}

.pending-item:last-child {
  border-bottom: 0;
}

.ingredient-name {
  overflow: hidden;
  color: #40584e;
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-shrink: 0;
}

.remove {
  color: #b48b75;
  font-size: 18rpx;
}

.purchase-button {
  height: 54rpx;
  padding: 0 14rpx;
  border-radius: 12rpx;
  background: #e8542e;
  color: #fff;
  font-size: 19rpx;
  line-height: 54rpx;
}

.purchased-section {
  margin-top: 34rpx;
}

.purchased-list {
  margin-top: 14rpx;
  padding: 0 20rpx;
  border-color: #e5e9e1;
  box-shadow: 0 12rpx 28rpx rgba(35, 74, 55, .045);
}

.purchased-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #edf0ea;
}

.purchased-item:last-child {
  border-bottom: 0;
}

.purchased-mark {
  position: relative;
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #dceee3;
}

.purchased-mark::after {
  position: absolute;
  top: 7rpx;
  left: 8rpx;
  width: 11rpx;
  height: 6rpx;
  border-bottom: 2rpx solid #438067;
  border-left: 2rpx solid #438067;
  content: '';
  transform: rotate(-45deg);
}

.purchased-status {
  flex-shrink: 0;
  padding: 5rpx 10rpx;
  border-radius: 8rpx;
  background: #eef4e8;
  color: #64894a;
  font-size: 18rpx;
}

.price {
  flex-shrink: 0;
  color: #b87350;
  font-size: 21rpx;
}

.empty-basket {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 130rpx 20rpx 80rpx;
  text-align: center;
}

.empty-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  background: #e8f2eb;
}

.empty-icon::before {
  content: '';
  position: absolute;
  width: 54rpx;
  height: 42rpx;
  border: 4rpx solid #e8542e;
  border-top: 0;
  border-radius: 0 0 12rpx 12rpx;
}

.empty-icon::after {
  content: '';
  position: absolute;
  top: 28rpx;
  width: 32rpx;
  height: 18rpx;
  border: 4rpx solid #e8542e;
  border-bottom: 0;
  border-radius: 18rpx 18rpx 0 0;
}

.empty-icon view {
  position: absolute;
  top: 58rpx;
  left: 34rpx;
  right: 34rpx;
  border-top: 3rpx solid #a9c4b7;
}

.empty-title {
  margin-top: 26rpx;
  color: #235a49;
  font-size: 31rpx;
  font-weight: 750;
}

.empty-desc {
  max-width: 560rpx;
  margin-top: 12rpx;
  color: #899189;
  font-size: 23rpx;
  line-height: 1.7;
}

/* 空状态按钮组：单按钮胶囊，收窄居中不再占满整行 */
.empty-actions {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 34rpx;
}

.empty-actions button {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 26rpx;
  border-radius: 999rpx;
}

.empty-actions .primary-button {
  box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .18);
}
</style>

<style scoped>
.basket-intro {
  padding-bottom: 24rpx;
}

.eyebrow {
  color: #c93d20;
}

.page-title {
  color: #33261e;
  font-family: Georgia, 'Songti SC', serif;
  letter-spacing: -1rpx;
}

.page-desc {
  color: #8a7a70;
}

.basket-summary {
  border-color: #f0e3d6;
  background: #fff;
  box-shadow: 0 14rpx 30rpx rgba(232, 84, 46, .07);
}

.summary-mark {
  background: #fdeee7;
}

.summary-mark .app-icon {
  color: #e8542e;
}

.summary-title {
  color: #33261e;
}

.summary-caption {
  color: #a29388;
}

.view-switch {
  border-color: #f0e3d6;
  background: #fff1e7;
}

.view-switch-item.active {
  color: #c93d20;
}

.basket-summary>.app-icon {
  color: #e8542e;
  transform: rotate(0deg);
}

.basket-progress {
  border-color: #f0d9c9;
  background: linear-gradient(110deg, #fff6ee, #fdf0e4);
}

.progress-kicker {
  color: #b8862f;
}

.progress-title {
  color: #6f5f54;
}

.progress-ring {
  border-color: #e9a13b;
  color: #b8862f;
}

.section-title {
  color: #33261e;
  font-family: Georgia, 'Songti SC', serif;
}

.caption {
  color: #a29388;
}

.pending-group,
.purchased-list,
.purchased-recipe-group {
  border-color: #f0e3d6;
  box-shadow: 0 12rpx 28rpx rgba(232, 84, 46, .06);
}

.recipe-row {
  border-color: #f5e9dd;
}

.recipe-row image {
  background: #f7ede3;
}

.recipe-title {
  color: #33261e;
}

.recipe-meta,
.ingredient-amount {
  color: #a29388;
}

.pending-item {
  border-color: #f5e9dd;
}

.ingredient-name {
  color: #6f5f54;
}

.remove {
  color: #a98a77;
}

.purchase-button {
  background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%);
  box-shadow: 0 8rpx 16rpx rgba(232, 84, 46, .22);
}

.purchased-item {
  border-color: #f5e9dd;
}

.purchased-mark {
  background: #eef4e8;
}

.purchased-mark::after {
  border-color: #7ba05b;
}

.price {
  color: #e8542e;
  font-weight: 700;
}

.empty-icon {
  background: #fdeee7;
}

.empty-icon .app-icon {
  color: #e8542e;
}

.empty-title {
  color: #33261e;
}

.empty-desc {
  color: #a29388;
}
</style>
