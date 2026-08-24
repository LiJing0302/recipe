<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import RecipeCard from '@/components/RecipeCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import { fetchCommunityRecipes, isCollected, loadCollections, toggleCollection } from '@/services/recipe'
import type { Recipe } from '@/types'

const recipes = ref<Recipe[]>([])
const collected = ref<Record<string, boolean>>({})

const load = async () => {
  await loadCollections().catch(() => undefined)
  try {
    recipes.value = (await fetchCommunityRecipes()).slice(0, 3)
  } catch (error) {
    console.error('[home] recommendations load failed', error)
    recipes.value = []
  }
  collected.value = Object.fromEntries(recipes.value.map((recipe) => [recipe.id, isCollected(recipe.id)]))
}
const open = (id: string) => uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` })
const collect = async (id: string) => { try { collected.value[id] = await toggleCollection(id); uni.showToast({ title: collected.value[id] ? '已加入我的食谱' : '已取消收藏', icon: 'none' }) } catch { uni.showToast({ title: '收藏操作失败，请检查服务连接', icon: 'none' }) } }
const scan = () => uni.navigateTo({ url: '/pages/scan/index' })
const openCommunity = () => uni.switchTab({ url: '/pages/community/index' })
onShow(() => { void load() })
</script>

<template>
  <view class="home-page">
    <view class="home-top page-shell">
      <view class="topbar">
        <view class="brand-lockup"><view class="brand-mark"><view class="brand-leaf brand-leaf-one" /><view class="brand-leaf brand-leaf-two" /></view><view><text class="brand-name">食光</text><text class="brand-subtitle">一日三餐的灵感</text></view></view>
        <view class="avatar-wrap"><image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80" mode="aspectFill" /></view>
      </view>
      <view class="greeting"><text class="eyebrow">GOOD FOOD, GOOD DAY</text><text class="hello">今天想吃点什么？</text><text class="greeting-desc">从一束新鲜香草，开始一顿认真生活。</text></view>
      <view class="hero" @click="scan">
        <view class="hero-decoration hero-decoration-one" /><view class="hero-decoration hero-decoration-two" />
        <view class="hero-copy"><view class="hero-label"><AppIcon name="spark" size="sm" /><text>AI 食材识别</text></view><text class="hero-title">让冰箱里的食材<br /><text class="hero-title-accent">变成一顿好饭</text></text><view class="hero-action"><text>拍照开始</text><AppIcon name="arrow-up-right" size="sm" /></view></view>
        <view class="hero-visual"><view class="plate-shadow" /><view class="plate"><view class="plate-food food-one" /><view class="plate-food food-two" /><view class="plate-food food-three" /><view class="plate-garnish" /></view><view class="visual-label">SCAN<br />& COOK</view></view>
      </view>
      <view class="quick-grid">
        <view class="quick-item quick-item-primary" @click="scan"><view class="quick-icon"><AppIcon name="camera" size="md" /></view><view class="quick-copy"><text class="quick-title">识别食材</text><text class="quick-desc">从现有食材找灵感</text></view><AppIcon name="arrow-up-right" size="sm" /></view>
        <view class="quick-item" @click="uni.switchTab({ url: '/pages/menu/index' })"><view class="quick-icon"><AppIcon name="calendar" size="md" /></view><view class="quick-copy"><text class="quick-title">安排菜单</text><text class="quick-desc">把想吃的放进今天</text></view><AppIcon name="arrow-up-right" size="sm" /></view>
      </view>
    </view>
    <view class="section page-shell">
      <view class="section-heading"><view><text class="section-kicker">FOR YOU</text><text class="section-title">今日推荐</text></view><text class="section-link" @click="openCommunity">查看全部 <AppIcon name="chevron-right" size="sm" /></text></view>
      <scroll-view scroll-x class="recommend-scroll" :show-scrollbar="false"><view class="recommend-row"><RecipeCard v-for="recipe in recipes" :key="recipe.id" compact :recipe="recipe" :collected="collected[recipe.id]" @open="open" @toggle-collect="collect" /></view></scroll-view>
      <view class="home-note"><view class="note-line" /><text>把平凡的一餐，过成值得期待的日常</text><view class="note-line" /></view>
    </view>
  </view>
</template>

<style scoped>
.home-page { min-height: 100vh; overflow: hidden; background: #fdf8f2; }
.home-top { padding-top: 38rpx; padding-bottom: 30rpx; }
.topbar { display: flex; align-items: center; justify-content: space-between; }
.brand-lockup { display: flex; align-items: center; gap: 12rpx; }
.brand-mark { position: relative; width: 54rpx; height: 54rpx; border-radius: 18rpx 18rpx 18rpx 6rpx; background: linear-gradient(140deg, #ff8a3d 0%, #e8542e 100%); transform: rotate(-8deg); box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .28); }
.brand-leaf { position: absolute; width: 18rpx; height: 28rpx; border-radius: 18rpx 2rpx 18rpx 2rpx; background: #ffd9a8; transform: rotate(34deg); }
.brand-leaf-one { top: 10rpx; left: 14rpx; }
.brand-leaf-two { top: 20rpx; left: 26rpx; background: #7ba05b; transform: rotate(70deg) scale(.78); }
.brand-name { display: block; color: #33261e; font-size: 31rpx; font-weight: 800; letter-spacing: 3rpx; }
.brand-subtitle { display: block; margin-top: 2rpx; color: #a29388; font-size: 17rpx; letter-spacing: 1rpx; }
.avatar-wrap, .avatar-wrap image { width: 68rpx; height: 68rpx; border-radius: 50%; }
.avatar-wrap { overflow: hidden; border: 5rpx solid #fff; background: #f0e3d6; box-shadow: 0 8rpx 20rpx rgba(232, 84, 46, .14); }
.greeting { margin-top: 58rpx; }
.eyebrow, .section-kicker { display: block; color: #c93d20; font-size: 18rpx; font-weight: 700; letter-spacing: 3rpx; }
.hello { display: block; margin-top: 12rpx; color: #33261e; font-size: 50rpx; font-weight: 800; letter-spacing: 1rpx; }
.greeting-desc { display: block; margin-top: 10rpx; color: #8a7a70; font-size: 23rpx; }
.hero { position: relative; display: flex; align-items: center; justify-content: space-between; min-height: 332rpx; margin-top: 38rpx; padding: 34rpx 30rpx 30rpx 34rpx; overflow: hidden; border-radius: 32rpx; background: linear-gradient(140deg, #ff8a3d 0%, #e8542e 62%, #d84a28 100%); box-shadow: 0 18rpx 38rpx rgba(232, 84, 46, .24); }
.hero-copy { position: relative; z-index: 2; }
.hero-label { display: flex; align-items: center; gap: 7rpx; color: rgba(255, 255, 255, .92); font-size: 22rpx; font-weight: 700; letter-spacing: 1rpx; }
.hero-label .app-icon { display: flex; align-items: center; justify-content: center; padding: 5rpx; border-radius: 50%; background: rgba(255, 255, 255, .24); color: #fff; box-sizing: content-box; }
.hero-title { display: block; margin-top: 18rpx; color: #fff; font-size: 41rpx; line-height: 1.38; font-weight: 800; }
.hero-title-accent { color: #ffd9c2; }
.hero-action { display: flex; align-items: center; gap: 15rpx; margin-top: 27rpx; color: #fff; font-size: 24rpx; font-weight: 700; }
.hero-action .app-icon { display: flex; align-items: center; justify-content: center; padding: 11rpx; border-radius: 50%; background: #fff; color: #e8542e; box-sizing: content-box; }
.hero-visual { position: relative; width: 210rpx; height: 244rpx; margin-right: -12rpx; }
.plate-shadow { position: absolute; right: 5rpx; bottom: 28rpx; width: 186rpx; height: 42rpx; border-radius: 50%; background: rgba(120, 40, 10, .22); filter: blur(8rpx); transform: rotate(-12deg); }
.plate { position: absolute; right: 9rpx; top: 31rpx; width: 178rpx; height: 178rpx; border: 10rpx solid #fff6ec; border-radius: 50%; background: #ffd9a8; box-shadow: inset 0 0 0 4rpx #f0b276, 0 11rpx 0 rgba(150, 60, 20, .16); transform: rotate(-17deg); }
.plate::before { position: absolute; top: 30rpx; left: 31rpx; width: 96rpx; height: 96rpx; border-radius: 50%; background: #f0935a; content: ''; }
.plate-food { position: absolute; z-index: 1; border-radius: 50%; }
.food-one { top: 46rpx; left: 48rpx; width: 48rpx; height: 25rpx; background: #c93d20; transform: rotate(28deg); }
.food-two { top: 87rpx; left: 30rpx; width: 38rpx; height: 25rpx; background: #ffd166; transform: rotate(-25deg); }
.food-three { top: 91rpx; right: 26rpx; width: 34rpx; height: 27rpx; background: #7ba05b; transform: rotate(38deg); }
.plate-garnish { position: absolute; z-index: 2; top: 62rpx; right: 49rpx; width: 22rpx; height: 42rpx; border-radius: 22rpx 2rpx; background: #e9a13b; transform: rotate(33deg); }
.visual-label { position: absolute; right: 0; bottom: 2rpx; color: rgba(255, 255, 255, .7); font-size: 15rpx; font-weight: 800; line-height: 1.35; letter-spacing: 2rpx; text-align: right; }
.hero-decoration { position: absolute; border-radius: 50%; border: 1rpx solid rgba(255, 255, 255, .22); }
.hero-decoration-one { right: -78rpx; top: -90rpx; width: 290rpx; height: 290rpx; }
.hero-decoration-two { right: 22rpx; bottom: -170rpx; width: 330rpx; height: 330rpx; }
.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 16rpx; }
.quick-item { position: relative; display: flex; align-items: center; gap: 14rpx; min-height: 108rpx; padding: 18rpx 20rpx; border: 1rpx solid #f0e3d6; border-radius: 24rpx; background: #fff; box-shadow: 0 8rpx 22rpx rgba(232, 84, 46, .05); }
.quick-item-primary { border-color: #f5d9cd; background: #fdeee7; }
.quick-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 48rpx; height: 48rpx; border-radius: 15rpx; background: #fde3d6; color: #c93d20; }
.quick-item:not(.quick-item-primary) .quick-icon { background: #fdf3e0; color: #b8862f; }
.quick-copy { min-width: 0; }
.quick-title, .quick-desc { display: block; }
.quick-title { color: #33261e; font-size: 25rpx; font-weight: 750; }
.quick-desc { margin-top: 6rpx; overflow: hidden; color: #a29388; font-size: 19rpx; text-overflow: ellipsis; white-space: nowrap; }
.quick-item > .app-icon { align-self: flex-start; margin-left: auto; color: #e8542e; }
.section { padding-top: 34rpx; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; }
.section-title { display: block; margin-top: 7rpx; color: #33261e; font-size: 38rpx; font-weight: 800; }
.section-link { display: inline-flex; align-items: center; padding-bottom: 4rpx; color: #c93d20; font-size: 22rpx; }
.section-link .app-icon { margin-left: 5rpx; }
.recommend-scroll { width: 100%; margin-top: 22rpx; }
.recommend-row { display: flex; gap: 18rpx; padding: 4rpx 2rpx 20rpx; }
.home-note { display: flex; align-items: center; gap: 12rpx; padding: 8rpx 0 24rpx; color: #cbb8a8; font-size: 18rpx; letter-spacing: 1rpx; white-space: nowrap; }
.note-line { flex: 1; height: 1rpx; background: #f0e3d6; }
</style>
