<script setup lang="ts">
import { TAB_PAGES } from '@/constants/tabbar'
import { useTabBarStore } from '@/stores/tabbar'
import { switchAppTab, type AppTabIndex } from '@/services/tabbar'

/**
 * 单页面容器使用的唯一悬浮 TabBar。它只负责展示 store 状态，
 * 页面内容由根容器切换，不通过路由切换五个 Tab 页面。
 */
const store = useTabBarStore()

const switchTab = (index: number) => switchAppTab(index as AppTabIndex)
</script>

<template>
  <view class="tabbar-shell" :class="{ 'is-hidden': !store.visible }" role="navigation" aria-label="主导航">
    <view class="tabbar-glass">
      <view
        v-for="(tab, index) in TAB_PAGES"
        :key="tab.id"
        class="tabbar-item"
        :class="{ active: store.selected === index }"
        :aria-label="tab.label"
        :title="tab.label"
        @click="switchTab(index)"
      >
        <view class="tabbar-icon-wrap">
          <image class="tabbar-icon" :src="store.selected === index ? tab.activeIcon : tab.icon" mode="aspectFit" />
        </view>
        <text class="tabbar-label">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tabbar-shell {
  position: fixed;
  right: 22rpx;
  bottom: calc(14rpx + env(safe-area-inset-bottom));
  left: 22rpx;
  z-index: 9000;
  pointer-events: none;
  transition: opacity .28s ease, transform .28s cubic-bezier(.2, .8, .2, 1);
}

.tabbar-shell.is-hidden {
  opacity: 0;
  transform: translateY(30rpx) scale(.96);
  pointer-events: none;
}

.tabbar-glass {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 112rpx;
  padding: 8rpx;
  border: 1rpx solid rgba(255, 255, 255, .85);
  border-radius: 999rpx; /* 胶囊：两端完整半圆 */
  /* 半透明基底：即便设备不支持 backdrop-filter，也能呈现柔和的磨砂质感 */
  background: rgba(255, 255, 255, .66);
  box-shadow: 0 18rpx 46rpx rgba(79, 58, 44, .18), 0 3rpx 12rpx rgba(255, 255, 255, .55) inset;
  box-sizing: border-box;
  overflow: hidden;
  -webkit-backdrop-filter: blur(28px) saturate(165%);
  backdrop-filter: blur(28px) saturate(165%);
  pointer-events: auto;
}

.tabbar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2rpx;
  border-radius: 999rpx; /* 激活项同为胶囊，形成「胶囊内嵌胶囊」层次 */
  color: #8d8179;
  -webkit-tap-highlight-color: transparent;
  transition: background-color .18s ease, color .18s ease, transform .12s ease;
}

.tabbar-item:active {
  transform: scale(.96);
}

.tabbar-item.active {
  background: linear-gradient(135deg, rgba(255, 138, 61, .22), rgba(232, 84, 46, .16));
  color: #d94d2b;
}

.tabbar-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
}

.tabbar-icon {
  display: block;
  width: 42rpx;
  height: 42rpx;
  opacity: .78;
}

.tabbar-item.active .tabbar-icon {
  opacity: 1;
}

.tabbar-label {
  max-width: 100%;
  overflow: hidden;
  color: inherit;
  font-size: 18rpx;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 360px) {
  .tabbar-shell { right: 14rpx; left: 14rpx; }
  .tabbar-glass { height: 104rpx; border-radius: 999rpx; }
  .tabbar-icon-wrap { width: 46rpx; height: 46rpx; }
  .tabbar-icon { width: 38rpx; height: 38rpx; }
  .tabbar-label { font-size: 17rpx; }
}
</style>
