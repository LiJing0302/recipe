<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import StepAiSuggestion from '@/components/StepAiSuggestion.vue'
import type { RecipeStep, RecipeStepSuggestion } from '@/types'

const props = defineProps<{
  step: RecipeStep
  index: number
  loading: boolean
  suggestion?: RecipeStepSuggestion
  images: string[]
}>()
defineEmits<{
  'ai-action': []
  input: []
  'apply-suggestion': []
  'dismiss-suggestion': []
  'choose-images': []
  'remove-image': [index: number]
}>()
</script>

<template>
  <view class="step-form">
    <text class="step-form-index">{{ index + 1 }}</text>
    <view class="step-form-fields">
      <view class="step-field-header">
        <text class="step-field-label">步骤内容</text>
        <view class="step-ai-action" :class="{ disabled: loading }" @click.stop="$emit('ai-action')">
          <AppIcon name="spark" size="xs" :label="step.description.trim() ? 'AI 优化文本' : 'AI 填写'" />
          <text>{{ loading ? '生成中' : step.description.trim() ? 'AI 优化文本' : 'AI 填写' }}</text>
        </view>
      </view>
      <textarea v-model="step.description" class="step-content-input" maxlength="120" placeholder="步骤内容：写下具体做法"
        auto-height @input="$emit('input')" />
      <view v-if="loading" class="step-ai-status">
        <AppIcon name="spark" size="xs" /><text>正在生成第 {{ index + 1 }} 步建议</text>
      </view>
      <StepAiSuggestion v-if="suggestion" :suggestion="suggestion" :index="index"
        @apply="$emit('apply-suggestion')" @dismiss="$emit('dismiss-suggestion')" />
      <input v-model="step.tip" class="step-tip-input" placeholder="小贴士（可选）" />
      <view class="step-image-toolbar">
        <text class="step-image-label">步骤图片</text>
        <text class="add-link" @click.stop="$emit('choose-images')">+ 添加图片</text>
      </view>
      <view v-if="images.length" class="step-image-grid">
        <view v-for="(image, imageIndex) in images" :key="image + imageIndex" class="step-image-item">
          <image :src="image" mode="aspectFill" />
          <text @click.stop="$emit('remove-image', imageIndex)">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.step-form {
  display: flex;
  gap: 16rpx;
  margin-top: 18rpx;
}
.step-form-index {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: $sage-mist;
  color: $brand-dark;
  font-size: 22rpx;
}
.step-form-fields {
  flex: 1;
}
.step-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40rpx;
  margin-bottom: 8rpx;
}
.step-field-label {
  color: $ink-field;
  font-size: 22rpx;
}
.step-ai-action {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-height: 40rpx;
  color: $brand-dark;
  font-size: 21rpx;
}
.step-ai-action.disabled {
  opacity: .55;
}
.step-form-fields input,
.step-form-fields textarea {
  width: 100%;
  padding: 16rpx;
  border-radius: $radius-12;
  background: $surface;
  color: $ink-deep;
  font-size: 24rpx;
  box-sizing: border-box;
}
.step-content-input {
  min-height: 120rpx;
  margin-top: 0 !important;
  line-height: 1.5;
}
.step-ai-status {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 10rpx;
  color: $brand-dark;
  font-size: 20rpx;
}
.step-tip-input {
  height: 78rpx;
  margin-top: 12rpx;
  line-height: 46rpx;
}
.step-image-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
}
.step-image-label {
  color: $ink-field;
  font-size: 22rpx;
}
.step-image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}
.step-image-item {
  position: relative;
  width: 132rpx;
  height: 132rpx;
  overflow: hidden;
  border-radius: $radius-12;
  background: $surface-soft;
}
.step-image-item image {
  width: 100%;
  height: 100%;
}
.step-image-item text {
  position: absolute;
  right: 6rpx;
  bottom: 6rpx;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  background: rgba(23, 34, 30, .68);
  color: #fff;
  font-size: 18rpx;
}
</style>
