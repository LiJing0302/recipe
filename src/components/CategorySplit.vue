<script setup lang="ts">
import { computed } from 'vue'

/** 左侧分类项：名称 + 数量 */
export interface CategoryItem {
  name: string
  count: number
}

const props = withDefaults(defineProps<{
  /** 左侧分类列表 */
  categories: CategoryItem[]
  /** 当前选中分类名 */
  activeCategory: string
  /** 当前分类条目总数（用于右侧数量徽标） */
  total: number
  /** 右侧数量徽标文案，默认 `${total} 项` */
  totalLabel?: string
  /** 右侧标题上方的英文小字 */
  eyebrow?: string
}>(), {
  eyebrow: 'CURRENT CATEGORY'
})

const emit = defineEmits<{ select: [name: string] }>()

const totalLabel = computed(() => props.totalLabel || `${props.total} 项`)
</script>

<template>
  <view class="category-layout">
    <!-- 左侧分类导航 -->
    <!-- #ifdef H5 -->
    <view class="category-nav">
      <view v-for="category in categories" :key="category.name" class="category-nav-item"
        :class="{ active: activeCategory === category.name }" @click="emit('select', category.name)">
        <text class="nav-name">{{ category.name }}</text>
        <text class="nav-count">{{ category.count }}</text>
      </view>
    </view>
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <scroll-view class="category-nav" scroll-y :show-scrollbar="false">
      <view v-for="category in categories" :key="category.name" class="category-nav-item"
        :class="{ active: activeCategory === category.name }" @click="emit('select', category.name)">
        <text class="nav-name">{{ category.name }}</text>
        <text class="nav-count">{{ category.count }}</text>
      </view>
    </scroll-view>
    <!-- #endif -->

    <!-- 右侧内容（header + 插槽，列表内容由业务域自定义） -->
    <!-- scroll-view 是微信原生组件：① 必须有显式 height ② <slot> 不能直接放在它内部（slot 是自定义组件概念，与原生组件渲染层不兼容，会导致右侧内容不渲染）。故用 inner view 包裹 header+slot，再放进 scroll-view。 -->
    <view class="category-results-shell">
      <!-- #ifdef H5 -->
      <view class="category-results">
        <view class="results-header">
          <view><text class="results-eyebrow">{{ eyebrow }}</text><text class="results-title">{{ activeCategory
          }}</text></view><text class="results-count">{{ totalLabel }}</text>
        </view>
        <slot />
      </view>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <scroll-view class="category-results" scroll-y :show-scrollbar="false">
        <view class="category-results-inner">
          <view class="results-header">
            <view><text class="results-eyebrow">{{ eyebrow }}</text><text class="results-title">{{ activeCategory
            }}</text></view><text class="results-count">{{ totalLabel }}</text>
          </view>
          <slot />
        </view>
      </scroll-view>
      <!-- #endif -->
    </view>
  </view>
</template>

<style scoped>
/*
 * 布局说明：高度链用 height:100% 百分比（参照显式确定的父高度 my-page calc）。
 * 微信原生组件 scroll-view ① 必须有显式 height（不响应 flex:1 拉伸），
 * ② <slot> 不能直接放在它内部（会不渲染）—— 故右侧用 inner view 包裹 header+slot。
 * 父链 .my-page(calc) → .recipe-page-scroll → .recipe-sheet → .recipe-scroll-region
 * → .recipe-category-host → .category-layout → shell → .category-results 均为
 * 显式确定高度，height:100% 有效。
 *
 * 注意：小程序宿主节点（<category-split>）不带本组件的 data-v，:host{...} 无法命中。
 * 宿主宽度由使用方通过 class（如 .category-fill）显式撑满，不放在这里。
 *
 * 右侧 .category-results-shell 含小程序原生组件 scroll-view，flex 子项的
 * flex-grow 在 XWeb 引擎下有时不生效（basis:0 + 含原生组件子元素易塌缩），
 * 用 calc(100% - 176rpx) 显式计算剩余宽度，绕开 flex-grow 不确定性。
 */
.category-layout {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1rpx solid #e3e8df;
  border-radius: 26rpx;
  box-shadow: 0 16rpx 38rpx rgba(232, 84, 46, .065);
  box-sizing: border-box;
}

.category-nav {
  flex: 0 0 176rpx;
  width: 176rpx;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: #fdf8f2;
}

.category-nav-item {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10rpx;
  min-height: 72rpx;
  margin: 4rpx 8rpx 0;
  padding: 0 16rpx;
  border-radius: 14rpx;
  color: #a29388;
  transition: color .2s ease, font-weight .2s ease;
}

.category-nav-item.active {
  background: #fff;
  color: #c93d20;
  font-weight: 700;
  box-shadow: 0 4rpx 14rpx rgba(232, 84, 46, .08);
}

.category-nav-item.active::before {
  position: absolute;
  top: 14rpx;
  bottom: 14rpx;
  left: 0;
  width: 5rpx;
  border-radius: 0 5rpx 5rpx 0;
  background: linear-gradient(180deg, #ff8a3d, #e8542e);
  content: '';
}

.nav-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.35;
}

.nav-count {
  flex-shrink: 0;
  font-size: 18rpx;
  color: #cbb8a8;
}

.category-results-shell {
  flex: 1 1 auto;
  width: calc(100% - 176rpx);
  height: 100%;
  overflow: hidden;
  background-color: #ff8a3d;
}

.category-results {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0 18rpx 22rpx;
  box-sizing: border-box;
  background: #fffdfa;
}

.category-results-inner {
  display: block;
}

.results-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 26rpx 2rpx 18rpx;
}

.results-eyebrow {
  color: #93a39a;
  font-size: 18rpx;
  letter-spacing: 2rpx;
}

.results-title {
  display: block;
  margin-top: 8rpx;
  color: #20322d;
  font-size: 34rpx;
  font-weight: 700;
}

.results-count {
  flex-shrink: 0;
  margin-bottom: 4rpx;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: #f8eee8;
  color: #ad714f;
  font-size: 19rpx;
}

@media (max-width: 700px) {
  .category-nav {
    flex-basis: 160rpx;
    width: 160rpx;
  }

  .category-results-shell {
    width: calc(100% - 160rpx);
    background-color: #ff8a3d;
  }

  .category-nav-item {
    min-height: 66rpx;
    padding: 0 12rpx;
    gap: 8rpx;
  }

  .nav-name {
    font-size: 22rpx;
  }

  .nav-count {
    font-size: 17rpx;
  }

  .category-results {
    padding-right: 14rpx;
    padding-left: 14rpx;
  }

  .results-title {
    font-size: 32rpx;
  }
}
</style>
