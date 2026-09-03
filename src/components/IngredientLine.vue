<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { Ingredient } from '@/types'

const props = defineProps<{ ingredient: Ingredient; amountDraft: string }>()
defineEmits<{
  'open-picker': []
  'open-unit-picker': []
  'update:amountDraft': [value: string]
  'blur-amount': [value: string]
}>()
</script>

<template>
  <view class="line-form">
    <view class="ingredient-name-field" :class="{ 'is-empty': !ingredient.name }" @click="$emit('open-picker')">
      <text>{{ ingredient.name || '选择食材' }}</text>
      <AppIcon name="chevron-right" size="sm" />
    </view>
    <view class="amount-field">
      <input
        :value="amountDraft"
        type="text"
        placeholder="如：半、1/2、适量"
        @input="$emit('update:amountDraft', $event.detail.value)"
        @blur="$emit('blur-amount', $event.detail.value)"
      />
      <view v-if="ingredient.name" class="amount-unit-picker" @click.stop="$emit('open-unit-picker')">
        {{ ingredient.amount.unit || 'g' }}<text class="unit-chevron">⌄</text>
      </view>
      <text v-else class="amount-unit">g</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.line-form {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.line-form input {
  flex: 1;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: $radius-12;
  background: $surface;
  color: $ink-deep;
  font-size: 24rpx;
  box-sizing: border-box;
}
.amount-field {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 232rpx;
  min-width: 0;
  height: 72rpx;
  overflow: hidden;
  border-radius: $radius-12;
  background: $surface;
}
.amount-field input {
  flex: 1;
  min-width: 0;
  width: auto;
  padding: 0 0 0 18rpx;
  border-radius: 0;
  background: transparent;
}
.amount-unit {
  flex-shrink: 0;
  padding: 0 14rpx 0 8rpx;
  color: $gold-deep;
  font-size: 21rpx;
}
.amount-unit-picker {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  height: 72rpx;
  padding: 0 12rpx 0 8rpx;
  color: $gold-deep;
  font-size: 21rpx;
}
.unit-chevron {
  color: $ink-hint;
  font-size: 22rpx;
  line-height: 1;
}
.ingredient-name-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: $radius-12;
  background: $surface;
  color: $ink;
  font-size: 24rpx;
}
.ingredient-name-field.is-empty {
  color: $ink-hint;
}
.ingredient-name-field .app-icon {
  color: $ink-hint;
  transform: rotate(90deg);
}
</style>
