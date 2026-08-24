<script setup lang="ts">
import type { RecipeStep } from '@/types'

defineProps<{ steps: RecipeStep[]; current: number; completed: number[] }>()
const emit = defineEmits<{ select: [index: number] }>()
</script>

<template>
  <view class="steps">
    <view v-for="(step, index) in steps" :key="step.id" class="step-row" :class="{ current: current === index, done: completed.includes(index) }" @click="emit('select', index)">
      <view class="step-index">{{ completed.includes(index) ? '✓' : index + 1 }}</view>
      <view class="step-copy">
        <view class="step-title-row"><text class="step-title">{{ step.title }}</text><text v-if="step.duration" class="step-time">{{ step.duration }} 分钟</text></view>
        <text class="step-description">{{ step.description }}</text>
        <text v-if="step.tip && current === index" class="step-tip">注意：{{ step.tip }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.steps { display: flex; flex-direction: column; gap: 18rpx; }
.step-row { display: flex; gap: 20rpx; padding: 22rpx 0; border-bottom: 1rpx solid #f5e9dd; }
.step-row.current { margin: 0 -20rpx; padding: 22rpx 20rpx; border: 1rpx solid #c7dbcc; border-radius: 18rpx; background: #f1f7ef; }
.step-index { display: flex; flex: 0 0 50rpx; align-items: center; justify-content: center; width: 50rpx; height: 50rpx; border: 2rpx solid #b8c8bb; border-radius: 50%; color: #587166; font-size: 24rpx; }
.done .step-index { border-color: #c93d20; background: #c93d20; color: #fff; }
.step-copy { flex: 1; min-width: 0; }
.step-title-row { display: flex; justify-content: space-between; gap: 16rpx; }
.step-title { color: #33261e; font-size: 30rpx; font-weight: 700; }
.step-time { color: #a29388; font-size: 22rpx; }
.step-description { display: block; margin-top: 10rpx; color: #66736a; font-size: 25rpx; line-height: 1.6; }
.step-tip { display: block; margin-top: 14rpx; color: #9b6a2c; font-size: 23rpx; line-height: 1.5; }
</style>
