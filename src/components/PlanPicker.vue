<script setup lang="ts">
import { ref, watch } from 'vue'
import CalendarGrid from './CalendarGrid.vue'
import type { MealType } from '@/types'

const props = defineProps<{ open: boolean; recipeTitle: string; initialDate: string; inline?: boolean }>()
const emit = defineEmits<{ close: []; confirm: [date: string, meals: MealType[]]; select: [date: string] }>()

const mealOptions: Array<{ value: MealType; label: string; time: string }> = [
  { value: 'breakfast', label: '早餐', time: '07:00 - 09:00' },
  { value: 'lunch', label: '午餐', time: '11:30 - 13:30' },
  { value: 'dinner', label: '晚餐', time: '17:30 - 20:00' }
]

const toDate = (value: string) => new Date(`${value}T00:00:00`)
const formatDate = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
const today = formatDate(new Date())
const initialPlanDate = props.initialDate < today ? today : props.initialDate
const selectedDate = ref(initialPlanDate)
const selectedMeal = ref<MealType>('dinner')

watch(() => props.open, (open) => {
  if (!open) return
  selectedDate.value = props.initialDate < today ? today : props.initialDate
  selectedMeal.value = 'dinner'
})

const onSelect = (date: string) => {
  selectedDate.value = date
  if (props.inline) emit('select', date)
}
const selectMeal = (meal: MealType) => { selectedMeal.value = meal }
const confirm = () => {
  if (selectedDate.value < today) return uni.showToast({ title: '不能加入今天之前的计划', icon: 'none' })
  if (!selectedMeal.value) return uni.showToast({ title: '请选择一餐', icon: 'none' })
  emit('confirm', selectedDate.value, [selectedMeal.value])
}
</script>

<template>
  <!-- 内嵌模式：复用公共日历组件 -->
  <view v-if="inline" class="plan-inline">
    <CalendarGrid :initial-date="selectedDate" @select="onSelect" />
  </view>
  <!-- 弹窗模式 -->
  <view v-else-if="open" class="modal-mask" @click="emit('close')">
    <view class="plan-modal" @click.stop>
      <view class="modal-header"><view><text class="modal-kicker">ADD TO PLAN</text><text class="modal-title">安排「{{ recipeTitle }}」</text></view><text class="close" @click="emit('close')">×</text></view>
      <CalendarGrid :initial-date="selectedDate" @select="onSelect" />
      <view class="meal-section"><view class="section-row"><text class="section-title">安排哪一餐</text><text class="caption">单选</text></view><view class="meal-options"><view v-for="meal in mealOptions" :key="meal.value" class="meal-option" :class="{ selected: selectedMeal === meal.value }" @click="selectMeal(meal.value)"><view class="meal-icon">{{ meal.value === 'breakfast' ? '早' : meal.value === 'lunch' ? '午' : '晚' }}</view><view class="meal-copy"><text>{{ meal.label }}</text><text>{{ meal.time }}</text></view><view class="check" :class="{ checked: selectedMeal === meal.value }">✓</view></view></view></view>
      <view class="modal-footer"><button class="secondary-button" @click="emit('close')">取消</button><button class="primary-button" @click="confirm">加入计划</button></view>
    </view>
  </view>
</template>

<style scoped>
.plan-inline { width: 100%; }
.modal-mask { position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; background: rgba(23,34,30,.42); }
.plan-modal { width: 100%; max-height: 92vh; padding: 34rpx 32rpx calc(28rpx + env(safe-area-inset-bottom)); overflow-y: auto; border-radius: 48rpx 48rpx 0 0; background: #fff; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; }
.modal-kicker { display: block; color: #9a8c72; font-size: 18rpx; letter-spacing: 2rpx; }
.modal-title { display: block; margin-top: 10rpx; color: #33261e; font-size: 34rpx; font-weight: 700; }
.close { padding: 0 6rpx; color: #a29388; font-size: 46rpx; line-height: 40rpx; }
.meal-section { margin-top: 24rpx; }
.section-row { display: flex; align-items: baseline; justify-content: space-between; }
.section-title { color: #33261e; font-size: 28rpx; font-weight: 700; }
.caption { color: #a29388; font-size: 20rpx; }
.meal-options { display: grid; gap: 12rpx; margin-top: 16rpx; }
.meal-option { display: flex; align-items: center; gap: 16rpx; min-height: 78rpx; padding: 12rpx 16rpx; border: 1rpx solid #f5e9dd; border-radius: 14rpx; }
.meal-option.selected { border-color: #e8b4a4; background: #fdf1ec; }
.meal-icon { display: flex; align-items: center; justify-content: center; width: 50rpx; height: 50rpx; border-radius: 12rpx; background: #fde3d6; color: #c93d20; font-size: 21rpx; font-weight: 700; }
.meal-copy { display: flex; flex-direction: column; gap: 5rpx; flex: 1; }
.meal-copy text:first-child { color: #34473f; font-size: 25rpx; font-weight: 600; }
.meal-copy text:last-child { color: #a0a8a0; font-size: 20rpx; }
.check { display: flex; align-items: center; justify-content: center; width: 34rpx; height: 34rpx; border: 1rpx solid #d8dfd7; border-radius: 50%; color: transparent; font-size: 21rpx; }
.check.checked { border-color: #c93d20; background: #c93d20; color: #fff; }
.modal-footer { display: flex; gap: 14rpx; margin-top: 26rpx; }
.modal-footer button { flex: 1; }
.modal-footer .secondary-button { height: 84rpx; line-height: 84rpx; }
.modal-footer .primary-button { height: 84rpx; line-height: 84rpx; }
</style>