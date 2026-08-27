<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'

// 微信要求 tabBar.list 至少包含两个页面；该页面不参与业务导航，
// 仅作为合法配置占位，避免广场页被当成第二个 TabBar 宿主而产生第二个实例。
onLoad(() => {
  uni.reLaunch({ url: '/pages/index/index' })
})
</script>

<template>
  <view />
</template>
