<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AuthPanel from '@/components/AuthPanel.vue'
import { getCookingRecords } from '@/services/cooking'
import { clearAuthSession, getCurrentUser, isAuthenticated } from '@/services/storage'
import type { CookingRecord, UserProfile } from '@/types'

const user = ref<UserProfile>(getCurrentUser())
const authenticated = ref(isAuthenticated())
const records = ref<CookingRecord[]>([])
const totalCooking = computed(() => records.value.length)
const cookingDays = computed(() => new Set(
  records.value
    .map((record) => record.date?.slice(0, 10))
    .filter(Boolean)
).size)

const load = async () => {
  authenticated.value = isAuthenticated()
  if (!authenticated.value) return
  user.value = getCurrentUser()
  records.value = getCookingRecords()
}

onShow(() => { void load() })
const handleAuthenticated = (nextUser: UserProfile) => { user.value = nextUser; authenticated.value = true; void load() }
const logout = () => { clearAuthSession(); authenticated.value = false; records.value = []; uni.showToast({ title: '已退出登录', icon: 'none' }) }
</script>

<template>
  <AuthPanel v-if="!authenticated" @authenticated="handleAuthenticated" />
  <view v-else class="page-shell profile-page">
    <view class="profile-hero"><view class="profile-kicker-row"><text class="profile-kicker">MY KITCHEN</text><AppIcon name="spark" size="sm" /></view><view class="profile-head"><view class="avatar-wrap"><image :src="user.avatar" mode="aspectFill" /></view><view class="profile-copy"><text class="profile-name">{{ user.name }}</text><text class="profile-bio">{{ user.bio || '认真吃饭，也认真生活' }}</text></view><view class="edit"><AppIcon name="pencil" size="sm" /><text>编辑资料</text></view></view><view class="profile-stats"><view><text class="number">{{ totalCooking }}</text><text class="label">累计烹饪</text></view><view class="stats-divider" /><view><text class="number">{{ cookingDays }}</text><text class="label">烹饪日</text></view></view></view>
    <view class="settings"><view><view class="setting-icon"><AppIcon name="info" size="md" /></view><text>关于食光</text><text class="version">v0.1.0</text><AppIcon name="chevron-right" size="sm" /></view></view>
    <view class="logout" @click="logout"><AppIcon name="arrow-up-right" size="sm" /><text>退出登录</text></view>
  </view>
</template>

<style scoped>
.profile-page { padding-top: 28rpx; }
.profile-hero { margin: 10rpx 0 0; padding: 30rpx 26rpx 26rpx; border-radius: 28rpx; background: linear-gradient(135deg, #ff8a3d, #e8542e); box-shadow: 0 18rpx 36rpx rgba(232, 84, 46, .2); }
.profile-kicker { display: block; color: #bbddcc; font-size: 18rpx; font-weight: 600; letter-spacing: 2rpx; }
.profile-head { display: flex; align-items: center; gap: 18rpx; margin-top: 20rpx; }
.avatar-wrap { padding: 4rpx; border: 2rpx solid rgba(255,255,255,.38); border-radius: 50%; }
.profile-head image { width: 100rpx; height: 100rpx; border-radius: 50%; background: #d7e8dd; }
.profile-copy { flex: 1; min-width: 0; }
.profile-name { display: block; overflow: hidden; color: #fff; font-size: 36rpx; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.profile-bio { display: block; margin-top: 8rpx; overflow: hidden; color: rgba(255, 255, 255, .88); font-size: 21rpx; text-overflow: ellipsis; white-space: nowrap; }
.edit { flex-shrink: 0; padding: 9rpx 12rpx; border: 1rpx solid rgba(255,255,255,.35); border-radius: 999rpx; color: #fff; font-size: 18rpx; }
.profile-stats { display: flex; align-items: center; justify-content: space-around; margin-top: 26rpx; padding: 22rpx 0 2rpx; text-align: center; }
.number { display: block; color: #fff; font-size: 40rpx; font-weight: 750; }
.label { display: block; margin-top: 6rpx; color: rgba(255, 255, 255, .72); font-size: 19rpx; }
.stats-divider { width: 1rpx; height: 54rpx; background: rgba(255,255,255,.26); }
.settings { margin-top: 22rpx; padding: 0 22rpx; border: 1rpx solid #e0ebe3; border-radius: 20rpx; background: #fff; box-shadow: 0 10rpx 24rpx rgba(35, 79, 62, .04); }
.settings > view { display: flex; align-items: center; padding: 24rpx 0; color: #40584e; font-size: 24rpx; }
.setting-icon { width: 38rpx; height: 38rpx; margin-right: 14rpx; border-radius: 12rpx; }
.about-icon { position: relative; background: #fff0e7; }
.about-icon::after { position: absolute; top: 9rpx; left: 16rpx; width: 6rpx; height: 19rpx; border-radius: 999rpx; background: #dd8d5f; content: ''; }
.version { margin-left: auto; color: #96a39b; font-size: 20rpx; }
.logout { display: block; margin: 32rpx 0; color: #c06c61; font-size: 22rpx; text-align: center; }
</style>

<style scoped>
.profile-page { padding-top: 24rpx; }
.profile-hero { margin-top: 8rpx; border: 1rpx solid #d84a28; background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 62%, #d84a28 100%); box-shadow: 0 18rpx 36rpx rgba(232, 84, 46, .22); }
.profile-kicker-row { display: flex; align-items: center; justify-content: space-between; }
.profile-kicker { color: rgba(255, 255, 255, .82); }
.profile-kicker-row .app-icon { color: #ffd9a8; }
.profile-head image { background: #f7ede3; }
.edit { display: flex; align-items: center; gap: 5rpx; border-color: rgba(255,255,255,.32); }
.edit .app-icon { color: #ffd9a8; }
.profile-stats { border-top: 1rpx solid rgba(255,255,255,.18); }
.settings { border-color: #f0e3d6; box-shadow: 0 10rpx 24rpx rgba(232, 84, 46, .05); }
.settings > view { color: #6f5f54; }
.setting-icon { display: flex; align-items: center; justify-content: center; margin-right: 14rpx; background: #fdeee7; color: #e8542e; }
.about-icon::after { display: none; }
.version { color: #a29388; }
.settings > view > .app-icon { margin-left: 14rpx; color: #e9a13b; }
.logout { display: flex; align-items: center; justify-content: center; gap: 6rpx; color: #b64f45; }
.logout .app-icon { transform: rotate(90deg); }
</style>
