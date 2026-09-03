<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { RecipeStepSuggestion } from '@/types'

defineProps<{ suggestion: RecipeStepSuggestion; index: number }>()
defineEmits<{ apply: []; dismiss: [] }>()
</script>

<template>
  <view class="step-ai-suggestion">
    <view class="step-ai-suggestion-header">
      <view class="step-ai-suggestion-title">
        <AppIcon name="spark" size="xs" /><text>AI 步骤建议</text>
      </view>
      <text class="step-ai-suggestion-step">第 {{ index + 1 }} 步</text>
    </view>
    <text class="step-ai-description">{{ suggestion.description }}</text>
    <text v-if="suggestion.tip" class="step-ai-tip">小贴士：{{ suggestion.tip }}</text>
    <view class="step-ai-actions">
      <view class="step-ai-apply" @click="$emit('apply')">
        <AppIcon name="check" size="xs" /><text>使用建议</text>
      </view>
      <view class="step-ai-dismiss" @click="$emit('dismiss')">
        <AppIcon name="close" size="xs" /><text>暂不使用</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.step-ai-suggestion {
  margin-top: 12rpx;
  padding: 18rpx;
  border: 1rpx solid $line-suggest;
  border-radius: $radius-14;
  background: $surface-suggest;
}
.step-ai-suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.step-ai-suggestion-title {
  display: flex;
  align-items: center;
  gap: 6rpx;
  color: $brand-dark;
  font-size: 21rpx;
  font-weight: 600;
}
.step-ai-suggestion-step {
  color: $ink-faint;
  font-size: 20rpx;
}
.step-ai-description {
  display: block;
  margin-top: 12rpx;
  color: $ink-sage;
  font-size: 23rpx;
  line-height: 1.55;
}
.step-ai-tip {
  display: block;
  margin-top: 8rpx;
  color: $ink-tan;
  font-size: 21rpx;
  line-height: 1.45;
}
.step-ai-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 16rpx;
}
.step-ai-apply,
.step-ai-dismiss {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 21rpx;
}
.step-ai-apply {
  color: $brand-dark;
}
.step-ai-dismiss {
  color: $ink-faint;
}
</style>
