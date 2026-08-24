<script setup lang="ts">
import { ref } from 'vue'
import { loginAccount, registerAccount } from '@/services/api'
import { saveAuthSession } from '@/services/storage'
import { loadIngredientConfigsRemote } from '@/services/ingredient-config'
import type { UserProfile } from '@/types'

const emit = defineEmits<{ authenticated: [user: UserProfile] }>()
const mode = ref<'login' | 'register'>('login')
const account = ref('')
const password = ref('')
const confirmation = ref('')
const loading = ref(false)

const submit = async () => {
  const normalizedAccount = account.value.trim()
  if (normalizedAccount.length < 3) return uni.showToast({ title: '账号至少 3 个字符', icon: 'none' })
  if (password.value.length < 6) return uni.showToast({ title: '密码至少 6 个字符', icon: 'none' })
  if (mode.value === 'register' && password.value !== confirmation.value) return uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
  loading.value = true
  try {
    const result = mode.value === 'login' ? await loginAccount(normalizedAccount, password.value) : await registerAccount(normalizedAccount, password.value)
    saveAuthSession(result.token, result.user)
    await loadIngredientConfigsRemote()
    emit('authenticated', result.user)
    uni.showToast({ title: mode.value === 'login' ? '登录成功' : '注册成功', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '操作失败，请稍后重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const switchMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  password.value = ''
  confirmation.value = ''
}
</script>

<template>
  <view class="auth-page">
    <view class="auth-mark"><view /></view>
    <text class="auth-kicker">MY KITCHEN</text>
    <text class="auth-title">{{ mode === 'login' ? '登录食光' : '创建账号' }}</text>
    <text class="auth-desc">{{ mode === 'login' ? '登录后管理你的食谱和做饭计划' : '用账号密码开始维护自己的菜单' }}</text>
    <view class="auth-form surface">
      <view class="field"><text class="field-label">账号</text><input v-model="account" class="field-input" placeholder="请输入账号" maxlength="60" /></view>
      <view class="field"><text class="field-label">密码</text><input v-model="password" class="field-input" password placeholder="请输入密码" maxlength="72" /></view>
      <view v-if="mode === 'register'" class="field"><text class="field-label">确认密码</text><input v-model="confirmation" class="field-input" password placeholder="请再次输入密码" maxlength="72" /></view>
      <button class="primary-button auth-button" :disabled="loading" @click="submit">{{ loading ? '处理中...' : mode === 'login' ? '登录' : '注册' }}</button>
    </view>
    <view class="mode-switch"><text>{{ mode === 'login' ? '还没有账号？' : '已经有账号？' }}</text><text class="switch-link" @click="switchMode">{{ mode === 'login' ? '立即注册' : '去登录' }}</text></view>
  </view>
</template>

<style scoped>
.auth-page { display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 118rpx 32rpx 80rpx; background: #f7f8f6; }
.auth-mark { position: relative; width: 78rpx; height: 66rpx; margin-bottom: 34rpx; border: 5rpx solid #e8542e; border-top: 0; border-radius: 0 0 16rpx 16rpx; }
.auth-mark::before { content: ''; position: absolute; top: -22rpx; left: 13rpx; width: 42rpx; height: 28rpx; border: 5rpx solid #e8542e; border-bottom: 0; border-radius: 30rpx 30rpx 0 0; }
.auth-mark view { position: absolute; top: 25rpx; left: 13rpx; right: 13rpx; border-top: 3rpx solid #a9c4b7; }
.auth-kicker { color: #89a096; font-size: 19rpx; font-weight: 600; letter-spacing: 3rpx; }
.auth-title { margin-top: 14rpx; color: #21342e; font-size: 50rpx; font-weight: 750; }
.auth-desc { margin-top: 12rpx; color: #84938a; font-size: 23rpx; }
.auth-form { width: 100%; margin-top: 44rpx; padding: 30rpx 24rpx 24rpx; border: 1rpx solid #e0ebe3; border-radius: 24rpx; box-shadow: 0 16rpx 34rpx rgba(29, 73, 59, .045); }
.field { margin-bottom: 22rpx; }
.field-label { display: block; margin-bottom: 10rpx; color: #698177; font-size: 21rpx; }
.field-input { width: 100%; height: 82rpx; padding: 0 20rpx; border: 1rpx solid #e0eae2; border-radius: 16rpx; background: #fafcf9; color: #263a32; font-size: 25rpx; line-height: 82rpx; }
.auth-button { width: 100%; margin-top: 10rpx; }
.mode-switch { margin-top: 28rpx; color: #899189; font-size: 23rpx; }
.switch-link { margin-left: 8rpx; color: #c93d20; }
</style>

<style scoped>
.auth-page { background: #fdf8f2; }
.auth-mark { border-color: #e8542e; }
.auth-mark::before { border-color: #e8542e; }
.auth-mark view { border-color: #f5b6a3; }
.auth-kicker { color: #c93d20; }
.auth-title { color: #33261e; font-family: Georgia, 'Songti SC', serif; }
.auth-desc { color: #8a7a70; }
.auth-form { border-color: #f0e3d6; box-shadow: 0 16rpx 34rpx rgba(232, 84, 46, .06); }
.field-label { color: #8a7a70; }
.field-input { border-color: #f0e3d6; background: #fff; color: #33261e; }
.mode-switch { color: #a29388; }
.switch-link { color: #c93d20; }
</style>
