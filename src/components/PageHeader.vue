<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(defineProps<{
  title: string
  showBack?: boolean
}>(), {
  showBack: true
})

type CapsuleRect = {
  top?: number
  height?: number
}

const statusBarHeight = ref(0)
const navigationBarHeight = ref('88rpx')
const headerStyle = computed(() => ({
  '--page-header-status-height': `${statusBarHeight.value}px`,
  '--page-header-navigation-height': navigationBarHeight.value
}))

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  const getCapsule = (uni as unknown as { getMenuButtonBoundingClientRect?: () => CapsuleRect }).getMenuButtonBoundingClientRect
  const capsule = typeof getCapsule === 'function' ? getCapsule() : undefined
  if (!capsule?.height) return

  // The custom navigation row must use the same vertical center as the native capsule.
  const capsuleTop = capsule.top || statusBarHeight.value
  const rowHeight = Math.max(capsule.height, (capsuleTop - statusBarHeight.value) * 2 + capsule.height)
  navigationBarHeight.value = `${rowHeight}px`
})

const goBack = () => {
  if (!props.showBack) return
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page-header" :style="headerStyle">
    <view class="page-header-fixed">
      <view class="page-header-status" aria-hidden="true" />
      <view class="page-header-navigation">
        <view v-if="props.showBack" class="page-header-back" aria-label="返回上一页" title="返回上一页" @click="goBack">
          <AppIcon name="chevron-right" size="xl" class="page-header-back-icon" />
        </view>
        <text class="page-header-title">{{ props.title }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page-header {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: calc(var(--page-header-status-height, 0px) + var(--page-header-navigation-height, 88rpx));
}

.page-header-fixed {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 100;
  width: 100%;
  background: #fdf8f2;
}

.page-header-status {
  height: var(--page-header-status-height, 0px);
}

.page-header-navigation {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  width: 100%;
  height: var(--page-header-navigation-height, 88rpx);
  padding: 0;
}

.page-header-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 88rpx;
}

.page-header-back {
  color: #8a7a70;
}

.page-header-back:active {
  opacity: .6;
}

.page-header-back-icon {
  transform: rotate(180deg);
}

.page-header-title {
  position: absolute;
  top: 0;
  right: 112rpx;
  bottom: 0;
  left: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #33261e;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
