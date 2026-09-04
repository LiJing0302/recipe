<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { ref } from 'vue'
import RecipeEditor from '@/components/RecipeEditor.vue'

const mode = ref<'create' | 'edit'>('create')
const recipeId = ref('')
onLoad((options) => {
  recipeId.value = options?.id || ''
  mode.value = recipeId.value ? 'edit' : 'create'
  uni.setNavigationBarTitle({ title: mode.value === 'edit' ? '编辑食谱' : '新建食谱' })
})
const goBack = () => setTimeout(() => uni.navigateBack(), 500)
</script>

<template>
  <view class="recipe-edit-screen">
    <PageHeader :title="mode === 'edit' ? '编辑食谱' : '新建食谱'" />
    <RecipeEditor :mode="mode" :recipe-id="recipeId" @saved="goBack" />
  </view>
</template>

<style scoped>
.recipe-edit-screen { min-height: 100vh; background: #fdf8f2; }
</style>
