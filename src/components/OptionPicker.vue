<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  options: { label: string; value: string }[]
  model: string
  title: string
  kicker?: string
  desc?: string
  mode?: 'center' | 'bottom'
}>(), { mode: 'center', kicker: '', desc: '' })

const emit = defineEmits<{ 'update:modelValue': [value: boolean]; select: [value: string] }>()

const close = () => emit('update:modelValue', false)
const select = (value: string) => emit('select', value)
</script>

<template>
  <up-popup
    :show="modelValue"
    :mode="mode"
    :round="mode === 'center' ? 24 : undefined"
    custom-class="popup-static"
    :safe-area-inset-bottom="mode === 'bottom'"
    @close="close"
    @cancel="close"
  >
    <view :class="mode === 'center' ? 'picker-modal' : 'picker-sheet'" @click.stop>
      <view class="picker-header">
        <view>
          <text v-if="kicker" class="picker-kicker">{{ kicker }}</text>
          <text class="picker-title">{{ title }}</text>
          <text v-if="desc" class="picker-desc">{{ desc }}</text>
        </view>
        <view class="picker-close" @click="close">
          <AppIcon name="close" size="md" />
        </view>
      </view>
      <view class="picker-options">
        <view
          v-for="option in options"
          :key="option.value"
          class="picker-option"
          :class="{ active: model === option.value }"
          @click="select(option.value)"
        >
          <text>{{ option.label }}</text>
          <text v-if="model === option.value" class="picker-check">✓</text>
        </view>
      </view>
    </view>
  </up-popup>
</template>

<style scoped lang="scss">
.picker-modal {
  width: 620rpx;
  max-width: calc(100vw - 64rpx);
  padding: 32rpx;
  border: 1rpx solid $line;
  border-radius: $radius-md;
  background: $surface;
  box-sizing: border-box;
}
.picker-sheet {
  width: 100%;
  max-height: 82vh;
  padding: 30rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  overflow-y: auto;
  border: 1rpx solid $line;
  border-radius: $radius-48 $radius-48 0 0;
  background: $surface;
  box-sizing: border-box;
}
.picker-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.picker-kicker {
  display: block;
  color: $gold-deep;
  font-size: 18rpx;
  letter-spacing: 2rpx;
}
.picker-title {
  display: block;
  margin-top: 10rpx;
  color: $ink;
  font-size: 34rpx;
  font-weight: 750;
}
.picker-desc {
  display: block;
  margin-top: 8rpx;
  color: $ink-faint;
  font-size: 21rpx;
  line-height: 1.4;
}
.picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 54rpx;
  height: 54rpx;
  border-radius: 16rpx;
  background: $surface-tint;
  color: $ink-faint;
}
.picker-options {
  margin-top: 26rpx;
}
.picker-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 78rpx;
  padding: 0 20rpx;
  border: 1rpx solid $line;
  border-radius: $radius-14;
  color: $ink-soft;
  font-size: 25rpx;
}
.picker-option + .picker-option {
  margin-top: 12rpx;
}
.picker-option.active {
  border-color: $brand;
  background: $brand-soft;
  color: $brand-dark;
  font-weight: 600;
}
.picker-check {
  font-size: 30rpx;
}
</style>
