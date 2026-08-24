<script setup lang="ts">
import { getCurrentUser } from '@/services/storage'
import type { Recipe } from '@/types'

defineProps<{ recipe: Recipe; compact?: boolean; collected?: boolean; readonly?: boolean }>()
const currentUser = getCurrentUser()
const emit = defineEmits<{ open: [id: string]; toggleCollect: [id: string]; edit: [id: string] }>()
</script>

<template>
  <view class="recipe-card" :class="{ compact }" @click="emit('open', recipe.id)">
    <image class="recipe-cover" :src="recipe.cover" mode="aspectFill" />
    <view class="recipe-body">
      <view class="recipe-heading">
        <text class="recipe-title">{{ recipe.title }}</text>
        <text v-if="!readonly && recipe.authorId === currentUser.id" class="edit" @click.stop="emit('edit', recipe.id)">编辑</text>
        <text v-else-if="!readonly" class="collect" @click.stop="emit('toggleCollect', recipe.id)">{{ collected ? '已收藏' : '收藏' }}</text>
      </view>
      <text class="recipe-subtitle">{{ recipe.subtitle }}</text>
      <view class="recipe-meta">
        <text>{{ recipe.duration }} 分钟</text>
        <text>{{ recipe.difficulty }}</text>
        <text class="rating">{{ recipe.ratingCount > 0 ? `★ ${recipe.rating}` : '暂无评分' }}</text>
      </view>
      <view class="tag-row">
        <text v-for="tag in recipe.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.recipe-card { display: flex; overflow: hidden; border: 1rpx solid #f0e3d6; border-radius: 28rpx; background: #fff; box-shadow: 0 14rpx 30rpx rgba(214, 96, 44, .07); transition: transform .2s ease, box-shadow .2s ease; }
.recipe-card:active { transform: scale(.99); }
.recipe-card.compact { width: 610rpx; box-shadow: 0 10rpx 22rpx rgba(214, 96, 44, .05); }
.recipe-cover { display: block; flex: 0 0 214rpx; width: 214rpx; height: 216rpx; background: #f7ede3; }
.compact .recipe-cover { width: 208rpx; height: 218rpx; }
.recipe-body { flex: 1; min-width: 0; padding: 20rpx 20rpx 18rpx; }
.compact .recipe-body { padding: 22rpx; }
.recipe-heading { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.recipe-title { overflow: hidden; color: #33261e; font-size: 30rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.collect, .edit { flex-shrink: 0; padding: 6rpx 12rpx; border-radius: 999rpx; background: #fdeee7; color: #c93d20; font-size: 20rpx; font-weight: 500; }
.recipe-subtitle { display: block; display: -webkit-box; min-height: 58rpx; margin-top: 9rpx; overflow: hidden; color: #8a7a70; font-size: 22rpx; line-height: 1.32; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.recipe-meta { display: flex; gap: 14rpx; margin-top: 14rpx; color: #a29388; font-size: 20rpx; }
.rating { color: #e9a13b; }
.tag-row { display: flex; gap: 8rpx; margin-top: 13rpx; overflow: hidden; }
.tag { flex-shrink: 0; padding: 6rpx 11rpx; border-radius: 999rpx; background: #fdf3e0; color: #b8862f; font-size: 18rpx; }
</style>
