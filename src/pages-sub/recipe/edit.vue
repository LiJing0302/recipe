<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
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
  <RecipeEditor :mode="mode" :recipe-id="recipeId" @saved="goBack" />
</template>
