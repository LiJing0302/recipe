<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { INGREDIENT_CATALOG, getIngredientsByCategory, searchIngredients } from '@/constants/ingredients'
import type { IngredientCatalogItem, IngredientCategory } from '@/constants/ingredients'
import { getAllIngredientCategories } from '@/services/ingredient-category'
import { getIngredientUnit } from '@/services/ingredient-config'
import { getIngredientKey } from '@/services/ingredient-matching'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; select: [payload: { name: string; unit: string; ingredientKey: string; matchMethod: 'exact' }] }>()

const keyword = ref('')
const activeCategory = ref('全部')

/** 分类 tab：全部 + 内置分类 + 用户自定义分类 */
const categories = computed(() => ['全部', ...getAllIngredientCategories()])

/** 单位取用户配置优先（食材分类页可维护），否则用目录默认 */
const withUnit = (items: IngredientCatalogItem[]): IngredientCatalogItem[] => items.map((item) => ({ ...item, unit: getIngredientUnit(item.name, item.unit) }))

/** 过滤后的食材：搜索优先，其次按分类 */
const filtered = computed<IngredientCatalogItem[]>(() => {
  const key = keyword.value.trim()
  if (key) return withUnit(searchIngredients(key, 80))
  if (activeCategory.value === '全部') return withUnit(INGREDIENT_CATALOG)
  return withUnit(getIngredientsByCategory(activeCategory.value as IngredientCategory))
})

const reset = () => { keyword.value = ''; activeCategory.value = '全部' }
watch(() => props.open, (open) => { if (open) reset() })

const pick = (item: IngredientCatalogItem) => { emit('select', { name: item.name, unit: item.unit, ingredientKey: getIngredientKey(item.name), matchMethod: 'exact' }); emit('close') }
</script>

<template>
  <up-popup :show="props.open" mode="bottom" :safe-area-inset-bottom="true" @close="emit('close')">
    <view class="picker">
      <view class="picker-head">
        <view><text class="picker-kicker">INGREDIENT</text><text class="picker-title">选择食材</text></view>
        <view class="picker-close" @click="emit('close')"><AppIcon name="close" size="md" /></view>
      </view>

      <!-- 顶部搜索筛选 -->
      <view class="picker-search">
        <text class="picker-search-icon">⌕</text>
        <input v-model="keyword" class="picker-search-input" placeholder="搜索食材，如：番茄" confirm-type="search" />
        <text v-if="keyword" class="picker-search-clear" @click="keyword = ''">×</text>
      </view>

      <!-- 分类 tabs -->
      <!-- #ifdef H5 -->
      <view class="picker-tabs">
        <view v-for="cat in categories" :key="cat" class="picker-tab" :class="{ active: activeCategory === cat }" @click="activeCategory = cat">{{ cat }}</view>
      </view>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <scroll-view class="picker-tabs" scroll-x :show-scrollbar="false">
        <view v-for="cat in categories" :key="cat" class="picker-tab" :class="{ active: activeCategory === cat }" @click="activeCategory = cat">{{ cat }}</view>
      </scroll-view>
      <!-- #endif -->

      <!-- 食材列表（H5 用 view + overflow，scroll-view 在 H5 下内部高度解析失败无法滚动） -->
      <!-- #ifdef H5 -->
      <view class="picker-list">
        <view v-for="item in filtered" :key="item.name" class="picker-item" @click="pick(item)">
          <text class="picker-item-name">{{ item.name }}</text>
          <text class="picker-item-meta">{{ item.category }} · {{ item.unit }}</text>
        </view>
        <view v-if="!filtered.length" class="picker-empty">没有找到相关食材</view>
      </view>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <scroll-view class="picker-list" scroll-y :show-scrollbar="false">
        <view v-for="item in filtered" :key="item.name" class="picker-item" @click="pick(item)">
          <text class="picker-item-name">{{ item.name }}</text>
          <text class="picker-item-meta">{{ item.category }} · {{ item.unit }}</text>
        </view>
        <view v-if="!filtered.length" class="picker-empty">没有找到相关食材</view>
      </scroll-view>
      <!-- #endif -->
    </view>
  </up-popup>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; max-height: 76vh; overflow: hidden; padding: 28rpx 26rpx 16rpx; box-sizing: border-box; border-radius: 48rpx 48rpx 0 0; background: #fdf8f2; }
.picker-head { display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; }
.picker-kicker { display: block; color: #b8862f; font-size: 16rpx; letter-spacing: 3rpx; font-weight: 700; }
.picker-title { display: block; margin-top: 6rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 34rpx; font-weight: 700; }
.picker-close { display: flex; align-items: center; justify-content: center; width: 54rpx; height: 54rpx; color: #a29388; }
.picker-search { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; margin-top: 18rpx; padding: 0 18rpx; height: 72rpx; border: 1rpx solid #f0e3d6; border-radius: 16rpx; background: #fff; }
.picker-search-icon { color: #c9b8a8; font-size: 32rpx; line-height: 1; }
.picker-search-input { flex: 1; min-width: 0; color: #33261e; font-size: 25rpx; }
.picker-search-clear { padding: 0 6rpx; color: #c9b8a8; font-size: 34rpx; line-height: 1; }
.picker-tabs { flex-shrink: 0; margin-top: 18rpx; white-space: nowrap; overflow-x: auto; }
.picker-tab { display: inline-flex; align-items: center; margin-right: 12rpx; padding: 9rpx 20rpx; border: 1rpx solid #f0e3d6; border-radius: 999rpx; background: #fff; color: #8a7a70; font-size: 22rpx; }
.picker-tab.active { border-color: #e8542e; background: #fdeee7; color: #c93d20; font-weight: 600; }
.picker-list { flex: 1; min-height: 0; overflow-y: auto; margin-top: 16rpx; }
.picker-item { display: flex; align-items: baseline; justify-content: space-between; padding: 22rpx 6rpx; border-bottom: 1rpx solid #f7efe6; }
.picker-item:active { opacity: .7; }
.picker-item-name { color: #33261e; font-size: 27rpx; font-weight: 600; }
.picker-item-meta { flex-shrink: 0; margin-left: 16rpx; color: #b8862f; font-size: 20rpx; }
.picker-empty { padding: 60rpx 0; color: #c9b8a8; font-size: 24rpx; text-align: center; }
</style>
