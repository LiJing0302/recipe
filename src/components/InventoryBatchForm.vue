<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CalendarGrid from '@/components/CalendarGrid.vue'
import { findIngredient, getIngredientCategory, searchIngredients } from '@/constants/ingredients'
import type { IngredientCategory } from '@/constants/ingredients'
import type { IngredientInventoryBatch } from '@/types'

export interface InventoryBatchDraft {
  name: string
  category: string
  purchasedAt: string
  storageMode: 'room' | 'chilled' | 'frozen'
}

const props = defineProps<{ open: boolean; batch?: IngredientInventoryBatch; title?: string }>()
const emit = defineEmits<{ close: []; save: [draft: InventoryBatchDraft] }>()
/** 食材库只记录名称和批次；不要求用户维护数量、单位或价格。 */
const form = reactive<InventoryBatchDraft>({ name: '', category: '其他', purchasedAt: '', storageMode: 'chilled' })
const storageModes = ['room', 'chilled', 'frozen'] as const
const storageLabels = ['常温', '冷藏', '冷冻']
const formTitle = computed(() => props.title || (props.batch ? '编辑食材批次' : '添加今日购入'))
const purchaseDatePickerOpen = ref(false)
const storagePickerOpen = ref(false)

/* 名称联想：从公共食材目录匹配 */
const suggestions = ref<ReturnType<typeof searchIngredients>>([])
const updateSuggestions = () => {
  const key = form.name.trim()
  if (!key) { suggestions.value = []; return }
  suggestions.value = searchIngredients(key, 8)
}
const pickSuggestion = (item: { name: string; category: IngredientCategory; unit: string }) => {
  form.name = item.name
  form.category = item.category
  suggestions.value = []
}
const blurSuggestions = () => setTimeout(() => { suggestions.value = [] }, 200)
const suggestionUnit = (item: { name: string; unit: string }) => item.unit

const reset = () => {
  const catalog = props.batch?.name ? findIngredient(props.batch.name) : undefined
  form.name = props.batch?.name || ''
  form.category = catalog?.category || props.batch?.category || (form.name ? getIngredientCategory(form.name) : '其他')
  form.purchasedAt = props.batch?.purchasedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  form.storageMode = props.batch?.storageMode || 'chilled'
  suggestions.value = []
}
watch(() => props.open, (open) => { purchaseDatePickerOpen.value = false; storagePickerOpen.value = false; if (open) reset() })
watch(() => props.batch, () => { if (props.open) reset() })
const openPurchaseDatePicker = () => { purchaseDatePickerOpen.value = true }
const closePurchaseDatePicker = () => { purchaseDatePickerOpen.value = false }
const selectPurchaseDate = (value: string[] | string) => {
  const date = Array.isArray(value) ? value[0] : value
  if (date) form.purchasedAt = date.slice(0, 10)
  closePurchaseDatePicker()
}
const openStoragePicker = () => { storagePickerOpen.value = true }
const closeStoragePicker = () => { storagePickerOpen.value = false }
const selectStorageMode = (storageMode: InventoryBatchDraft['storageMode']) => {
  form.storageMode = storageMode
  closeStoragePicker()
}
const updateName = () => {
  form.category = getIngredientCategory(form.name)
  updateSuggestions()
}
const submit = () => {
  if (!form.name.trim()) return uni.showToast({ title: '请输入食材名称', icon: 'none' })
  const detectedCategory = getIngredientCategory(form.name)
  emit('save', { ...form, category: detectedCategory === '其他' ? form.category : detectedCategory })
}
</script>

<template>
  <!-- 用 uview-plus u-popup 底部弹层，z-index 10075 高于 tabBar，避免被遮挡；不用 v-if，关闭时由 u-popup 内部播放收起动画（show=false 时根节点宽高归零不占位） -->
  <up-popup :show="open" mode="bottom" :safe-area-inset-bottom="true" @close="emit('close')">
    <view class="form-sheet">
      <view class="form-header"><view><text class="form-kicker">INGREDIENT BATCH</text><text class="form-title">{{ formTitle }}</text></view><view class="form-close" @click="emit('close')"><AppIcon name="close" size="md" /></view></view>
      <view class="form-field"><text class="field-label">食材名称</text><input v-model="form.name" class="field-input" placeholder="例如：芹菜" @input="updateName" @focus="updateSuggestions" @blur="blurSuggestions" />
        <view v-if="suggestions.length" class="suggest-list"><view v-for="item in suggestions" :key="item.name" class="suggest-item" @click="pickSuggestion(item)"><text class="suggest-name">{{ item.name }}</text><text class="suggest-meta">{{ item.category }} · {{ suggestionUnit(item) }}</text></view></view></view>
      <view class="batch-note">只记录家里是否有这项食材；数量、单位和价格不需要维护。</view>
      <view class="form-field"><text class="field-label">购入日期</text><view class="picker-input" @click="openPurchaseDatePicker"><text>{{ form.purchasedAt }}</text><AppIcon name="chevron-right" size="sm" /></view></view>
      <view class="form-field"><text class="field-label">保存方式</text><view class="picker-input" @click="openStoragePicker"><text>{{ storageLabels[storageModes.indexOf(form.storageMode)] }}</text><AppIcon name="chevron-right" size="sm" /></view></view>
      <button class="primary-button form-submit" @click="submit">保存</button>
    </view>
  </up-popup>
  <up-popup :show="purchaseDatePickerOpen" custom-class="popup-static" mode="center" :round="24" @close="closePurchaseDatePicker">
    <view class="date-modal" @click.stop>
      <view class="date-modal-header">
        <view>
          <text class="date-modal-eyebrow">PURCHASE DATE</text>
          <text class="date-modal-title">选择购入日期</text>
        </view>
        <view class="date-modal-close" @click="closePurchaseDatePicker"><AppIcon name="close" size="md" /></view>
      </view>
      <view class="date-calendar"><CalendarGrid :initial-date="form.purchasedAt" allow-past @select="selectPurchaseDate" /></view>
    </view>
  </up-popup>
  <up-popup :show="storagePickerOpen" custom-class="popup-static" mode="center" :round="24" @close="closeStoragePicker">
    <view class="storage-modal" @click.stop>
      <view class="storage-header"><view><text class="storage-eyebrow">STORAGE MODE</text><text class="storage-title">选择保存方式</text><text class="storage-desc">用于计算这批食材的新鲜程度</text></view><view class="storage-close" @click="closeStoragePicker"><AppIcon name="close" size="md" /></view></view>
      <view class="storage-options"><view v-for="(label, index) in storageLabels" :key="storageModes[index]" class="storage-option" :class="{ active: form.storageMode === storageModes[index] }" @click="selectStorageMode(storageModes[index])"><text>{{ label }}</text><text v-if="form.storageMode === storageModes[index]" class="storage-check">✓</text></view></view>
    </view>
  </up-popup>
</template>

<style scoped>
.form-sheet { width: 100%; padding: 30rpx 28rpx 40rpx; border-radius: 48rpx 48rpx 0 0; background: #fdf8f2; }
.form-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24rpx; }
.form-kicker { display: block; color: #b8862f; font-size: 18rpx; letter-spacing: 2rpx; }
.form-title { display: block; margin-top: 8rpx; color: #33261e; font-size: 34rpx; font-weight: 750; }
.form-close { display: flex; align-items: center; justify-content: center; width: 54rpx; height: 54rpx; color: #a29388; }
.form-row { display: flex; gap: 16rpx; }
.form-field { margin-top: 16rpx; }
.form-field-half { flex: 1; min-width: 0; }
.field-label { display: block; margin-bottom: 8rpx; color: #8a7a70; font-size: 21rpx; }
.field-input, .picker-input { width: 100%; height: 76rpx; padding: 0 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; color: #33261e; font-size: 25rpx; line-height: 76rpx; }
.picker-input { display: flex; align-items: center; justify-content: space-between; }
.picker-input .app-icon { color: #c93d20; transform: rotate(90deg); }
.batch-note { margin-top: 18rpx; padding: 16rpx 18rpx; border-radius: 14rpx; background: #fff1e6; color: #8a7a70; font-size: 21rpx; line-height: 1.5; }
.form-submit { margin-top: 28rpx; }
.storage-modal { width: 620rpx; max-width: calc(100vw - 64rpx); padding: 32rpx; border: 1rpx solid #f0e3d6; border-radius: 24rpx; background: #fff; box-sizing: border-box; }
.date-modal { width: 620rpx; max-width: calc(100vw - 64rpx); padding: 32rpx; border: 1rpx solid #f0e3d6; border-radius: 24rpx; background: #fff; box-sizing: border-box; }
.date-modal-header { display: flex; align-items: flex-start; justify-content: space-between; }
.date-modal-eyebrow { display: block; color: #b8862f; font-size: 16rpx; font-weight: 700; letter-spacing: 2rpx; }
.date-modal-title { display: block; margin-top: 8rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 34rpx; font-weight: 700; }
.date-modal-close { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 16rpx; background: #fff8f3; color: #a29388; }
.date-calendar { margin-top: 24rpx; }
.storage-header { display: flex; align-items: flex-start; justify-content: space-between; }
.storage-eyebrow { display: block; color: #b8862f; font-size: 16rpx; font-weight: 700; letter-spacing: 2rpx; }
.storage-title { display: block; margin-top: 8rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 34rpx; font-weight: 700; }
.storage-desc { display: block; margin-top: 8rpx; color: #a29388; font-size: 21rpx; line-height: 1.4; }
.storage-close { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 16rpx; background: #fff8f3; color: #a29388; }
.storage-options { margin-top: 26rpx; }
.storage-option { display: flex; align-items: center; justify-content: space-between; min-height: 78rpx; padding: 0 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; color: #6f7d73; font-size: 25rpx; }
.storage-option + .storage-option { margin-top: 12rpx; }
.storage-option.active { border-color: #e8542e; background: #fdeee7; color: #c93d20; font-weight: 600; }
.storage-check { font-size: 30rpx; }
/* 食材名称联想 */
.suggest-list { margin-top: 10rpx; overflow: hidden; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; box-shadow: 0 12rpx 26rpx rgba(232, 84, 46, .08); }
.suggest-item { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding: 15rpx 20rpx; border-bottom: 1rpx solid #f7efe6; }
.suggest-item:last-child { border-bottom: 0; }
.suggest-item:active { background: #fdf1ec; }
.suggest-name { color: #33261e; font-size: 25rpx; font-weight: 600; }
.suggest-meta { flex-shrink: 0; color: #a29388; font-size: 19rpx; }
</style>
