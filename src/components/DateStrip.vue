<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/services/menu'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const dates = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() + index - 2)
  return { value: formatDate(date), day: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()], number: date.getDate() }
}))
</script>

<template>
  <scroll-view scroll-x class="date-scroll" :show-scrollbar="false">
    <view class="date-row">
      <view v-for="item in dates" :key="item.value" class="date-item" :class="{ active: props.modelValue === item.value }" @click="emit('update:modelValue', item.value)">
        <text class="date-day">周{{ item.day }}</text>
        <text class="date-number">{{ item.number }}</text>
        <view v-if="item.value === formatDate()" class="today-dot" />
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
.date-scroll { width: 100%; white-space: nowrap; }
.date-row { display: flex; gap: 12rpx; padding: 8rpx 2rpx 18rpx; }
.date-item { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 92rpx; height: 116rpx; border: 1rpx solid #f0e3d6; border-radius: 18rpx; background: #fff; color: #a29388; box-shadow: 0 8rpx 18rpx rgba(214, 96, 44, .05); }
.date-item.active { border-color: #e8542e; background: linear-gradient(160deg, #ff8a3d 0%, #e8542e 100%); color: #fff; box-shadow: 0 14rpx 26rpx rgba(232, 84, 46, .3); transform: translateY(-3rpx); }
.date-day { font-size: 20rpx; }
.date-number { margin-top: 8rpx; font-size: 35rpx; font-weight: 800; }
.today-dot { position: absolute; bottom: 11rpx; width: 6rpx; height: 6rpx; border-radius: 50%; background: #e9a13b; }
</style>
