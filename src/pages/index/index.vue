<script setup lang="ts">
import { onLoad, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'
import AppTabBar from '@/custom-tab-bar/index.vue'
import AppIcon from '@/components/AppIcon.vue'
import MenuTab from '@/pages/menu/index.vue'
import BasketTab from '@/pages/basket/index.vue'
import IngredientsTab from '@/pages/ingredients/index.vue'
import RecipesTab from '@/pages/my-recipes/index.vue'
import ProfileTab from '@/pages/profile/index.vue'
import { showFloatingTabBar } from '@/services/tabbar'
import { useTabBarStore } from '@/stores/tabbar'

const TAB_TITLES = ['今日菜单', '菜篮子', '食材库', '我的食谱', '我的']
const store = useTabBarStore()
const statusBarHeight = ref(0)
const capsuleHeight = ref(0)
const setSafeTop = () => {
  // 动态读取真实状态栏高度，规避 CSS 变量 --status-bar-height 在 iOS 上取值不准的问题
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  // 小程序右上角胶囊（功能按钮）占位高度，用于食谱 tab 顶部预留避让；
  // H5 / 不支持的环境下 API 不存在，回退为 0（H5 无胶囊，不预留）
  const getCapsule = (uni as unknown as { getMenuButtonBoundingClientRect?: () => { height?: number } }).getMenuButtonBoundingClientRect
  const rect = typeof getCapsule === 'function' ? getCapsule() : null
  capsuleHeight.value = rect && rect.height ? rect.height : 0
}
const visited = ref([true, false, false, false, false])
type TabView = { refresh?: () => void | Promise<void> }
const menuTab = ref<TabView>()
const basketTab = ref<TabView & { openManualForm?: () => void }>()
const ingredientsTab = ref<TabView>()
const recipesTab = ref<TabView & { getSharePayload?: () => { title: string; path: string } }>()
const profileTab = ref<TabView>()
const hasShown = ref(false)

const openBasketManualForm = () => {
  basketTab.value?.openManualForm?.()
}

const setActiveTab = (index: number) => {
  if (index < 0 || index >= TAB_TITLES.length) return
  store.setSelected(index)
  visited.value[index] = true
  uni.setNavigationBarTitle({ title: TAB_TITLES[index] })
}

// TabBar 只修改全局选中态，根容器负责把该状态同步到视图挂载和导航标题。
// 这样点击 Tab 时首次访问才挂载组件，后续切换始终保留原实例。
watch(() => store.selected, (index) => {
  if (index < 0 || index >= TAB_TITLES.length) return
  visited.value[index] = true
  uni.setNavigationBarTitle({ title: TAB_TITLES[index] })
})

onLoad((options) => {
  setSafeTop()
  const incomingShareId = String(options?.shareId || '')
  if (incomingShareId) {
    uni.redirectTo({ url: `/pages-sub/shared-recipes/index?shareId=${encodeURIComponent(incomingShareId)}` })
    return
  }
  const requestedTab = Number(options?.tab)
  setActiveTab(Number.isInteger(requestedTab) ? requestedTab : store.selected)
})

onShow(() => {
  showFloatingTabBar()
  setActiveTab(store.selected)
  if (hasShown.value) {
    const activeView = [menuTab.value, basketTab.value, ingredientsTab.value, recipesTab.value, profileTab.value][store.selected]
    void activeView?.refresh?.()
  }
  hasShown.value = true
})

onShareAppMessage(() => recipesTab.value?.getSharePayload?.() || {
  title: '分享一道好菜',
  path: '/pages-sub/shared-recipes/index'
})
</script>

<template>
  <view class="app-container" :style="{ '--safe-top': statusBarHeight + 'px', '--capsule-h': capsuleHeight + 'px' }">
    <scroll-view v-show="store.selected === 0" class="tab-panel tab-scroll" scroll-y :scroll-with-animation="false">
      <MenuTab v-if="visited[0]" ref="menuTab" class="tab-child" :active="store.selected === 0" />
    </scroll-view>
    <scroll-view v-show="store.selected === 1" class="tab-panel tab-scroll" scroll-y :scroll-with-animation="false">
      <BasketTab v-if="visited[1]" ref="basketTab" class="tab-child" :active="store.selected === 1" />
    </scroll-view>
    <scroll-view v-show="store.selected === 2" class="tab-panel tab-scroll" scroll-y :scroll-with-animation="false">
      <IngredientsTab v-if="visited[2]" ref="ingredientsTab" class="tab-child" :active="store.selected === 2" />
    </scroll-view>
    <scroll-view v-show="store.selected === 3" class="tab-panel tab-scroll" scroll-y :scroll-with-animation="false">
      <RecipesTab v-if="visited[3]" ref="recipesTab" class="tab-child" :active="store.selected === 3" />
    </scroll-view>
    <scroll-view v-show="store.selected === 4" class="tab-panel tab-scroll" scroll-y :scroll-with-animation="false">
      <ProfileTab v-if="visited[4]" ref="profileTab" class="tab-child" :active="store.selected === 4" />
    </scroll-view>
    <AppTabBar />
    <button v-show="store.selected === 1" class="basket-fab" aria-label="添加今日购入" @click="openBasketManualForm">
      <AppIcon name="plus" size="lg" />
    </button>
  </view>
</template>

<style>
.app-container {
  position: relative;
  width: 100%;
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: 0;
  overflow: hidden;
}

.basket-fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(180rpx + env(safe-area-inset-bottom));
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(240, 131, 58, 0.175);
  box-shadow: 0 12rpx 30rpx rgba(232, 84, 46, .22);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  color: #8d8179;
}

.basket-fab::after {
  border: none;
}

.basket-fab:active {
  transform: scale(.94);
  opacity: .92;
}

.tab-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
}

.tab-scroll {
  box-sizing: border-box;
}

/* 小程序 scroll-view 的直接子节点（自定义 tab 组件宿主节点）不会自动撑满视口宽度，
   导致组件内部 width:100% 锚定到"内容宽度"而收缩（食谱 tab 的横向分栏最敏感）。
   这里对宿主节点显式撑满宽度；不设 height，各 tab 页自行控制高度，
   流式页可超过一屏由 scroll-view 滚动。class 打在组件宿主节点上，
   不穿透 styleIsolation 进入组件内部，安全。 */
.tab-child {
  display: block;
  width: 100%;
}
</style>
