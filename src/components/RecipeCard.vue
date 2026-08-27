<script setup lang="ts">
import { getCurrentUser } from '@/services/storage'
import type { Recipe } from '@/types'

defineProps<{ recipe: Recipe; compact?: boolean; collected?: boolean; readonly?: boolean; hideEdit?: boolean; hideRating?: boolean }>()
const currentUser = getCurrentUser()
const emit = defineEmits<{ open: [id: string]; toggleCollect: [id: string]; edit: [id: string] }>()
</script>

<template>
  <view class="recipe-card" :class="{ compact }" @click="emit('open', recipe.id)">
    <view class="recipe-cover-wrap">
      <image class="recipe-cover" :src="recipe.cover" mode="aspectFill" />
      <view class="recipe-cover-shade" />
      <text v-if="recipe.process" class="recipe-process-badge">{{ recipe.process }}</text>
    </view>
    <view class="recipe-body">
      <view class="recipe-heading">
        <text class="recipe-title">{{ recipe.title }}</text>
        <text v-if="!readonly && !hideEdit && recipe.authorId === currentUser.id" class="edit" @click.stop="emit('edit', recipe.id)">编辑</text>
        <text v-else-if="!readonly && recipe.authorId !== currentUser.id" class="collect" @click.stop="emit('toggleCollect', recipe.id)">{{ collected ? '已收藏' : '收藏' }}</text>
      </view>
      <text class="recipe-subtitle">{{ recipe.subtitle }}</text>
      <view v-if="recipe.duration || recipe.difficulty || (!hideRating && recipe.ratingCount > 0)" class="recipe-meta">
        <text v-if="recipe.duration" class="meta-item">{{ recipe.duration }} 分钟</text>
        <text v-if="recipe.difficulty" class="meta-item">{{ recipe.difficulty }}</text>
        <text v-if="!hideRating && recipe.ratingCount > 0" class="rating">★ {{ recipe.rating }}</text>
      </view>
      <view v-if="recipe.tags.length" class="tag-row">
        <text v-for="tag in recipe.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</text>
        <text v-if="recipe.cookingCount > 0" class="cooking-count">{{ recipe.cookingCount }} 次烹饪</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.recipe-card { display: flex; min-height: 238rpx; overflow: hidden; border: 1rpx solid #eadfd4; border-radius: 24rpx; background: #fff; box-shadow: 0 10rpx 26rpx rgba(86, 61, 43, .07); transition: transform .2s ease, box-shadow .2s ease; }
.recipe-card:active { transform: translateY(1rpx); box-shadow: 0 5rpx 14rpx rgba(86, 61, 43, .08); }
.recipe-card.compact { width: 610rpx; min-height: 226rpx; box-shadow: 0 8rpx 20rpx rgba(86, 61, 43, .05); }
.recipe-cover-wrap { position: relative; flex: 0 0 226rpx; width: 226rpx; height: 238rpx; overflow: hidden; background: #f5ebe2; }
.recipe-cover { display: block; width: 100%; height: 100%; background: #f5ebe2; }
.compact .recipe-cover-wrap { flex-basis: 214rpx; width: 214rpx; height: 226rpx; }
.recipe-cover-shade { position: absolute; right: 0; bottom: 0; left: 0; height: 35%; background: linear-gradient(transparent, rgba(42, 27, 18, .42)); pointer-events: none; }
.recipe-process-badge { position: absolute; bottom: 16rpx; left: 16rpx; padding: 5rpx 10rpx; border: 1rpx solid rgba(255, 255, 255, .42); border-radius: 8rpx; background: rgba(49, 34, 24, .38); color: #fff; font-size: 18rpx; line-height: 1.2; }
.recipe-body { display: flex; flex: 1; min-width: 0; flex-direction: column; padding: 22rpx 22rpx 18rpx; }
.compact .recipe-body { padding: 20rpx 22rpx 17rpx; }
.recipe-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14rpx; min-height: 44rpx; }
.recipe-title { display: -webkit-box; flex: 1; min-width: 0; overflow: hidden; color: #33261e; font-size: 31rpx; font-weight: 800; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.compact .recipe-title { font-size: 29rpx; }
.collect, .edit { flex-shrink: 0; padding: 6rpx 12rpx; border: 1rpx solid #f0d9cc; border-radius: 10rpx; background: #fff7f1; color: #c45b3e; font-size: 19rpx; line-height: 1.2; }
.recipe-subtitle { display: -webkit-box; min-height: 54rpx; margin-top: 10rpx; overflow: hidden; color: #89796e; font-size: 21rpx; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.recipe-meta { display: flex; flex-wrap: wrap; gap: 8rpx 16rpx; margin-top: 13rpx; color: #9a887a; font-size: 19rpx; line-height: 1.25; }
.meta-item { position: relative; }
.meta-item + .meta-item::before { position: absolute; top: 50%; left: -10rpx; width: 4rpx; height: 4rpx; border-radius: 50%; background: #c9b5a5; content: ''; transform: translateY(-50%); }
.rating { color: #d79236; }
.tag-row { display: flex; align-items: center; gap: 8rpx; min-height: 32rpx; margin-top: auto; overflow: hidden; padding-top: 12rpx; }
.tag { display: block; flex-shrink: 0; max-width: 150rpx; overflow: hidden; padding: 5rpx 10rpx; border-radius: 7rpx; background: #f8f0e2; color: #a27735; font-size: 17rpx; text-overflow: ellipsis; white-space: nowrap; }
.cooking-count { flex-shrink: 0; margin-left: auto; color: #b5a399; font-size: 17rpx; white-space: nowrap; }
</style>
