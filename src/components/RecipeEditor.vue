<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import IngredientLine from '@/components/IngredientLine.vue'
import StepEditor from '@/components/StepEditor.vue'
import OptionPicker from '@/components/OptionPicker.vue'
import { RECIPE_PROCESSES } from '@/constants/recipes'
import { enrichIngredient, amountInputValue, parseIngredientAmount } from '@/services/ingredient-matching'
import { getIngredientUnitOptions } from '@/services/ingredient-config'
import { fetchMyRecipeCategories, fetchRecipe, getRecipeDetail } from '@/services/recipe'
import { suggestRecipeMetadata, suggestRecipeStep, suggestRecipeSubtitle, type RecipeStepAiMode, type RecipeStepSuggestion } from '@/pages-sub/services/ai'
import { uploadImage } from '@/services/api'
import { getCurrentUser } from '@/services/storage'
import IngredientPicker from '@/components/IngredientPicker.vue'
import { useRecipeStore } from '@/stores/recipe'
import type { Ingredient, Recipe, RecipeDifficulty, RecipeProcess, RecipeStep, UserRecipeCategory } from '@/types'

type EditorMode = 'create' | 'edit'
type FormState = {
  title: string
  subtitle: string
  cover: string
  flavor: string
  servings: string
  duration: string
  difficulty: Recipe['difficulty'] | ''
  process: RecipeProcess | ''
  tags: string
  categories: string[]
  isPublic: boolean
}

const props = withDefaults(defineProps<{ mode: EditorMode; recipeId?: string }>(), { recipeId: '' })
const emit = defineEmits<{ saved: [recipe: Recipe] }>()
const recipeStore = useRecipeStore()
const difficulties: RecipeDifficulty[] = ['简单', '中等', '进阶']
const processes = RECIPE_PROCESSES as readonly RecipeProcess[]
const user = getCurrentUser()
const loading = ref(false)
const uploading = ref(false)
const aiMetadataLoading = ref(false)
const aiSubtitleLoading = ref(false)
const stepAiLoading = reactive<Record<string, boolean>>({})
const stepAiSuggestions = reactive<Record<string, RecipeStepSuggestion | undefined>>({})
let metadataRequestId = 0
const editingRecipe = ref<Recipe>()
const recipeCategories = ref<UserRecipeCategory[]>([])
const selectableCategories = computed(() => recipeCategories.value.filter((category) => category.id !== 'uncategorized' && category.name !== '未分类'))
const form = reactive<FormState>({ title: '', subtitle: '', cover: '', flavor: '', servings: '', duration: '', difficulty: '', process: '', tags: '', categories: [], isPublic: false })
const ingredients = ref<Ingredient[]>([])
const steps = ref<RecipeStep[]>([])
const amountDrafts = reactive<Record<string, string>>({})

const pageTitle = computed(() => props.mode === 'edit' ? '编辑食谱' : '新建食谱')
const pageEyebrow = computed(() => props.mode === 'edit' ? 'EDIT RECIPE' : 'NEW RECIPE')
const pageDescription = computed(() => props.mode === 'edit' ? '更新这道菜的内容和做法' : '记录一道属于自己的家常菜')
const difficultyPickerOptions = computed(() => [{ label: '暂不设置', value: '' }, ...difficulties.map((difficulty) => ({ label: difficulty, value: difficulty }))])
const processPickerOptions = computed(() => processes.map((process) => ({ label: process, value: process })))
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const emptyIngredient = (): Ingredient => ({ id: createId('ingredient'), name: '', amount: { raw: '', type: 'qualitative', conversion: 'none' } })
const emptyStep = (): RecipeStep => ({ id: createId('step'), title: '', description: '', images: [] })
const resetForm = () => {
  Object.assign(form, { title: '', subtitle: '', cover: '', flavor: '', servings: '', duration: '', difficulty: '', process: '', tags: '', categories: [], isPublic: false })
  Object.keys(amountDrafts).forEach((key) => delete amountDrafts[key])
  const firstIngredient = emptyIngredient()
  amountDrafts[firstIngredient.id] = ''
  ingredients.value = [firstIngredient]
  steps.value = [emptyStep()]
  editingRecipe.value = undefined
  metadataRequestId += 1
  aiMetadataLoading.value = false
  aiSubtitleLoading.value = false
  Object.keys(stepAiLoading).forEach((key) => delete stepAiLoading[key])
  Object.keys(stepAiSuggestions).forEach((key) => delete stepAiSuggestions[key])
}

const fillRecipe = (recipe: Recipe) => {
  editingRecipe.value = recipe
  const availableCategories = new Set(selectableCategories.value.map((category) => category.name))
  Object.assign(form, { title: recipe.title, subtitle: recipe.subtitle, cover: recipe.cover, flavor: recipe.flavor, servings: recipe.servings === undefined ? '' : String(recipe.servings), duration: recipe.duration === undefined ? '' : String(recipe.duration), difficulty: recipe.difficulty || '', process: recipe.process || '', tags: recipe.tags.join(', '), categories: (recipe.categories || []).filter((category) => availableCategories.has(category)).slice(0, 1), isPublic: recipe.isPublic })
  ingredients.value = recipe.ingredients.map((item) => {
    const normalized = enrichIngredient(item)
    amountDrafts[normalized.id] = amountInputValue(normalized.amount)
    return normalized
  })
  steps.value = recipe.steps.map((item) => ({ ...item, images: item.images || (item.image ? [item.image] : []) }))
  if (!ingredients.value.length) {
    const firstIngredient = emptyIngredient()
    amountDrafts[firstIngredient.id] = ''
    ingredients.value = [firstIngredient]
  }
  if (!steps.value.length) steps.value = [emptyStep()]
}

const load = async () => {
  resetForm()
  try {
    recipeCategories.value = await fetchMyRecipeCategories()
  } catch (error) {
    console.error('[recipe-editor] categories load failed', error)
    uni.showToast({ title: '分类加载失败，请检查服务连接', icon: 'none' })
  }
  if (props.mode !== 'edit' || !props.recipeId) return
  loading.value = true
  try {
    const localRecipe = getRecipeDetail(props.recipeId)
    if (localRecipe) {
      fillRecipe(localRecipe)
      return
    }
    fillRecipe(await fetchRecipe(props.recipeId))
  } catch (error) {
    console.error('[recipe-editor] load failed', error)
    uni.showToast({ title: '食谱加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

watch(() => [props.mode, props.recipeId], () => { void load() }, { immediate: true })

const addIngredient = () => {
  const ingredient = emptyIngredient()
  amountDrafts[ingredient.id] = ''
  ingredients.value.push(ingredient)
}
const addStep = () => steps.value.push(emptyStep())
const toggleCategory = (category: string) => { form.categories = form.categories[0] === category ? [] : [category] }
const difficultyPickerOpen = ref(false)
const openDifficultyPicker = () => { difficultyPickerOpen.value = true }
const closeDifficultyPicker = () => { difficultyPickerOpen.value = false }
const selectDifficulty = (value: string) => {
  form.difficulty = value as FormState['difficulty']
  closeDifficultyPicker()
}
const processPickerOpen = ref(false)
const openProcessPicker = () => { processPickerOpen.value = true }
const closeProcessPicker = () => { processPickerOpen.value = false }
const selectProcess = (value: string) => {
  form.process = value as RecipeProcess
  closeProcessPicker()
}

/* 食材选择：底部弹窗点选（公共食材目录），选中后自动带出该食材的单位与默认分量 */
const pickerOpen = ref(false)
const pickerTarget = ref('') // 当前选择食材的 ingredient id
const unitPickerOpen = ref(false)
const unitPickerTarget = ref<Ingredient>()
const openIngredientPicker = (ingredient: Ingredient) => {
  pickerTarget.value = ingredient.id
  pickerOpen.value = true
}
const handleSelectIngredient = (payload: { name: string; unit: string; ingredientKey: string; matchMethod: 'exact' }) => {
  const ingredient = ingredients.value.find((item) => item.id === pickerTarget.value)
  if (ingredient) {
    ingredient.name = payload.name
    ingredient.ingredientKey = payload.ingredientKey
    ingredient.sourceName = payload.name
    ingredient.matchMethod = payload.matchMethod
    ingredient.confidence = 1
    const current = amountDrafts[ingredient.id].trim()
    amountDrafts[ingredient.id] = current || '1'
    ingredient.amount = parseIngredientAmount(amountDrafts[ingredient.id], ingredient.name, payload.unit)
  }
  pickerTarget.value = ''
}
const ingredientUnitOptions = (ingredient: Ingredient) => getIngredientUnitOptions(ingredient.name, ingredient.amount.unit)
const ingredientUnitIndex = (ingredient: Ingredient) => Math.max(0, ingredientUnitOptions(ingredient).indexOf(ingredient.amount.unit || 'g'))
const changeIngredientUnit = (ingredient: Ingredient, index: string | number) => {
  const options = ingredientUnitOptions(ingredient)
  const unit = options[Number(index)] || 'g'
  if (unit === '适量') {
    amountDrafts[ingredient.id] = '适量'
    ingredient.amount = parseIngredientAmount('适量', ingredient.name, unit)
    return
  }
  const draft = amountDrafts[ingredient.id] || ingredient.amount.raw || '1'
  ingredient.amount = parseIngredientAmount(draft, ingredient.name, unit)
}
const openUnitPicker = (ingredient: Ingredient) => {
  unitPickerTarget.value = ingredient
  unitPickerOpen.value = true
}
const closeUnitPicker = () => {
  unitPickerOpen.value = false
  unitPickerTarget.value = undefined
}
const confirmUnitPicker = (event: { indexs?: number[]; value?: string[] }) => {
  const ingredient = unitPickerTarget.value
  if (ingredient) changeIngredientUnit(ingredient, event.indexs?.[0] || 0)
  closeUnitPicker()
}
const stepImages = (step: RecipeStep) => step.images?.length ? step.images : step.image ? [step.image] : []
const chooseCover = () => {
  if (uploading.value) return
  uni.chooseImage({
    count: 1, sourceType: ['album', 'camera'], success: async (result) => {
      uploading.value = true
      try {
        form.cover = (await uploadImage(result.tempFilePaths[0], 'cover')).url
      } catch (error) {
        console.error('[recipe-upload] cover upload failed', error)
        uni.showToast({ title: '主图上传失败，请查看控制台', icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}
const chooseStepImages = (step: RecipeStep) => {
  if (uploading.value) return
  uni.chooseImage({
    count: 9, sourceType: ['album', 'camera'], success: async (result) => {
      uploading.value = true
      try {
        const images = await Promise.all(result.tempFilePaths.map((filePath) => uploadImage(filePath, 'step')))
        step.images = [...stepImages(step), ...images.map((image) => image.url)]
        step.image = undefined
      } catch (error) {
        console.error('[recipe-upload] step upload failed', error)
        uni.showToast({ title: '步骤图片上传失败，请查看控制台', icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}
const removeStepImage = (step: RecipeStep, index: number) => {
  if (step.images?.length) step.images.splice(index, 1)
  else if (index === 0) step.image = undefined
}

const handleTitleBlur = () => {
  const title = form.title.trim()
  if (!title) return
  const requestId = ++metadataRequestId
  aiMetadataLoading.value = true
  void suggestRecipeMetadata({ title, categories: selectableCategories.value.map((category) => category.name) })
    .then((suggestion) => {
      if (requestId !== metadataRequestId || form.title.trim() !== title) return
      form.categories = suggestion.category ? [suggestion.category] : []
      form.process = suggestion.process || ''
      form.flavor = suggestion.flavor || ''
      form.difficulty = suggestion.difficulty || ''
    })
    .catch((error) => {
      if (requestId === metadataRequestId) {
        console.error('[recipe-ai] metadata suggestion failed', error)
        uni.showToast({ title: error instanceof Error ? error.message : 'AI 信息识别失败，请稍后重试', icon: 'none' })
      }
    })
    .finally(() => {
      if (requestId === metadataRequestId) aiMetadataLoading.value = false
    })
}

const generateSubtitle = async () => {
  if (aiSubtitleLoading.value) return
  const title = form.title.trim()
  if (!title) return uni.showToast({ title: '请先填写食谱名称', icon: 'none' })
  aiSubtitleLoading.value = true
  try {
    const subtitle = await suggestRecipeSubtitle({ title, flavor: form.flavor, process: form.process, difficulty: form.difficulty })
    if (form.title.trim() === title) form.subtitle = subtitle
  } catch (error) {
    console.error('[recipe-ai] subtitle suggestion failed', error)
    uni.showToast({ title: error instanceof Error ? error.message : 'AI 描述生成失败，请稍后重试', icon: 'none' })
  } finally {
    aiSubtitleLoading.value = false
  }
}

const stepSuggestion = (stepId: string) => stepAiSuggestions[stepId]

const handleStepInput = (step: RecipeStep) => {
  if (step.description.trim()) delete stepAiSuggestions[step.id]
}

const requestStepSuggestion = async (step: RecipeStep, stepIndex: number, mode: RecipeStepAiMode = 'fill', applyToStep = false) => {
  if (stepAiLoading[step.id] || (!applyToStep && stepAiSuggestions[step.id])) return
  const title = form.title.trim()
  const originalDescription = step.description.trim()
  const recipeIngredients = ingredients.value
    .filter((item) => item.name.trim())
    .map((item) => ({ name: item.name.trim(), amount: (amountDrafts[item.id] || item.amount.raw).trim() || '适量' }))
  if (!title) return
  if (!recipeIngredients.length) return uni.showToast({ title: '请先填写食材，再获取步骤建议', icon: 'none' })

  stepAiLoading[step.id] = true
  try {
    const suggestion = await suggestRecipeStep({
      mode,
      title,
      subtitle: form.subtitle.trim(),
      flavor: form.flavor.trim(),
      process: form.process,
      difficulty: form.difficulty,
      categories: form.categories,
      tags: form.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      servings: form.servings.trim(),
      duration: form.duration.trim(),
      ingredients: recipeIngredients,
      steps: steps.value.map((item, index) => ({ index, title: item.title.trim(), description: item.description.trim(), tip: item.tip?.trim() || '', duration: item.duration })),
      stepIndex
    })
    if (form.title.trim() !== title || step.description.trim() !== originalDescription) return
    if (applyToStep) {
      step.description = suggestion.description
      delete stepAiSuggestions[step.id]
    } else if (!step.description.trim()) {
      stepAiSuggestions[step.id] = suggestion
    }
  } catch (error) {
    console.error('[recipe-ai] step suggestion failed', error)
    uni.showToast({ title: error instanceof Error ? error.message : 'AI 步骤建议生成失败，请稍后重试', icon: 'none' })
  } finally {
    stepAiLoading[step.id] = false
  }
}

const handleStepAiAction = (step: RecipeStep, stepIndex: number) => {
  if (stepAiLoading[step.id]) return
  const mode: RecipeStepAiMode = step.description.trim() ? 'optimize' : 'fill'
  void requestStepSuggestion(step, stepIndex, mode, true)
}

const applyStepSuggestion = (step: RecipeStep) => {
  const suggestion = stepSuggestion(step.id)
  if (!suggestion) return
  if (!step.title.trim()) step.title = suggestion.title
  if (!step.description.trim()) step.description = suggestion.description
  if (!step.tip?.trim() && suggestion.tip) step.tip = suggestion.tip
  if (step.duration === undefined && suggestion.duration) step.duration = suggestion.duration
  delete stepAiSuggestions[step.id]
}

const dismissStepSuggestion = (stepId: string) => {
  delete stepAiSuggestions[stepId]
}

const save = async () => {
  if (!form.title.trim()) return uni.showToast({ title: '请填写食谱名称', icon: 'none' })
  if (!form.process) return uni.showToast({ title: '请选择制作工艺', icon: 'none' })
  if (!form.categories.length) return uni.showToast({ title: '请选择菜谱分类', icon: 'none' })
  const servings = form.servings.trim() ? Number(form.servings) : undefined
  const duration = form.duration.trim() ? Number(form.duration) : undefined
  if (servings !== undefined && (!Number.isInteger(servings) || servings < 1)) return uni.showToast({ title: '请填写有效的份量', icon: 'none' })
  if (duration !== undefined && (!Number.isInteger(duration) || duration < 1)) return uni.showToast({ title: '请填写有效的时长', icon: 'none' })
  const recipeIngredients = ingredients.value.filter((item) => item.name.trim()).map((item) => {
    const name = item.name.trim()
    const parsed = parseIngredientAmount(amountDrafts[item.id] || item.amount.raw, name, item.amount.unit)
    const raw = parsed.type === 'fixed' || parsed.type === 'range' ? `${parsed.raw}${parsed.unit || ''}` : parsed.raw
    const preserveSourceConversion = item.amount.sourceConversion && parsed.unit === item.amount.sourceConversion.unit
    return enrichIngredient({ ...item, name, amount: { ...parsed, raw, ...(preserveSourceConversion ? { sourceConversion: item.amount.sourceConversion } : {}) } })
  })
  const recipeSteps = steps.value.filter((item) => item.description.trim()).map((item, index) => ({ ...item, title: item.title.trim() || `步骤 ${index + 1}`, description: item.description.trim(), tip: item.tip?.trim() || undefined, duration: item.duration, images: stepImages(item) }))
  if (!recipeIngredients.length) return uni.showToast({ title: '请至少添加一项食材', icon: 'none' })
  if (!recipeSteps.length) return uni.showToast({ title: '请至少填写一步做法', icon: 'none' })

  const previous = editingRecipe.value
  const recipe: Recipe = {
    id: previous?.id || props.recipeId || `recipe-${Date.now()}`,
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    cover: form.cover.trim(),
    source: previous?.source || 'user',
    authorId: previous?.authorId || user.id,
    authorName: previous?.authorName || user.name,
    authorAvatar: previous?.authorAvatar || user.avatar,
    ingredients: recipeIngredients,
    steps: recipeSteps,
    categories: form.categories,
    tags: form.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
    flavor: form.flavor.trim(),
    process: form.process,
    servings,
    duration,
    difficulty: form.difficulty || undefined,
    rating: previous?.rating ?? 0,
    ratingCount: previous?.ratingCount ?? 0,
    cookingCount: previous?.cookingCount ?? 0,
    skillLevel: previous?.skillLevel ?? 1,
    isPublic: form.isPublic,
    createdAt: previous?.createdAt || new Date().toISOString().slice(0, 10)
  }

  try {
    const saved = props.mode === 'edit' ? await recipeStore.update(recipe) : await recipeStore.create(recipe)
    uni.showToast({ title: '已同步到云端', icon: 'success' })
    emit('saved', saved)
  } catch {
    uni.showToast({ title: '保存失败，请检查服务连接', icon: 'none' })
  }
}
</script>

<template>
  <view v-if="loading" class="empty-state">正在加载食谱...</view>
  <view v-else class="page-shell edit-page">
    <view class="editor-header"><text class="page-description">{{ pageDescription }}</text></view>
    <view class="field-block">
      <view class="field-label-row"><text class="field-label">食谱名称</text><text v-if="aiMetadataLoading"
          class="ai-status">AI 识别中</text></view><input v-model="form.title" class="text-input large" placeholder="填写菜名"
        @blur="handleTitleBlur" />
    </view>
    <view class="field-block">
      <view class="field-label-row"><text class="field-label">一句话描述</text>
        <view class="ai-field-button" :class="{ disabled: aiSubtitleLoading }" @click="generateSubtitle">
          <AppIcon name="spark" size="xs" label="AI 生成描述" /><text>{{ aiSubtitleLoading ? '生成中' : 'AI 辅助' }}</text>
        </view>
      </view><input v-model="form.subtitle" class="text-input" placeholder="可选，介绍这道菜的特点" />
    </view>
    <view class="category-section">
      <view class="section-row"><text class="field-label category-label">菜谱分类</text><text class="category-count">{{
        aiMetadataLoading ? '识别中' : form.categories.length ? form.categories[0] : '必选' }}</text></view>
      <view v-if="selectableCategories.length" class="category-options"><text v-for="category in selectableCategories"
          :key="category.id" class="category-option" :class="{ active: form.categories.includes(category.name) }"
          @click="toggleCategory(category.name)">{{ category.name }}</text></view><text v-else
        class="category-empty">暂无可用分类，请先检查网络连接</text>
    </view>
    <view class="field-block cover-block">
      <view class="section-row"><text class="field-label">主图</text><text class="add-link"
          @click="chooseCover">上传主图</text></view>
      <view class="cover-picker" @click="chooseCover">
        <image v-if="form.cover" :src="form.cover" mode="aspectFill" />
        <view v-else class="cover-placeholder">可选，上传一道菜的主图</view>
      </view>
    </view>
    <view class="field-block"><text class="field-label">制作工艺</text>
      <view class="select-input" @click="openProcessPicker"><text>{{ form.process || '请选择制作工艺' }}</text><text>⌄</text>
      </view>
    </view>
    <view class="field-grid">
      <view class="field-block"><text class="field-label">口味</text><input v-model="form.flavor" class="text-input"
          placeholder="可选，如酸甜、咸鲜" /></view>
      <view class="field-block"><text class="field-label">难度</text>
        <view class="select-input" @click="openDifficultyPicker"><text>{{ form.difficulty || '请选择难度'
            }}</text><text>⌄</text></view>
      </view>
    </view>
    <view class="field-grid">
      <view class="field-block"><text class="field-label">几人份（可选）</text><input v-model="form.servings" type="number"
          class="text-input" placeholder="可选" /></view>
      <view class="field-block"><text class="field-label">预计时长（分钟，可选）</text><input v-model="form.duration" type="number"
          class="text-input" placeholder="可选" /></view>
    </view>
    <view class="form-section">
      <view class="section-row"><text class="section-title">食材</text><text class="add-link" @click="addIngredient">+
          添加食材</text></view>
      <IngredientLine v-for="ingredient in ingredients" :key="ingredient.id" :ingredient="ingredient"
        :amount-draft="amountDrafts[ingredient.id] || ''" @open-picker="openIngredientPicker(ingredient)"
        @open-unit-picker="openUnitPicker(ingredient)" @update:amount-draft="(value) => (amountDrafts[ingredient.id] = value)"
        @blur-amount="(value) => { amountDrafts[ingredient.id] = value; ingredient.amount = parseIngredientAmount(value, ingredient.name, ingredient.amount.unit) }" />
    </view>
    <IngredientPicker :open="pickerOpen" @close="pickerOpen = false" @select="handleSelectIngredient" />
    <OptionPicker v-model="difficultyPickerOpen" :options="difficultyPickerOptions" :model="form.difficulty"
      kicker="RECIPE SETTINGS" title="选择难度" desc="根据准备和烹饪复杂度选择" mode="center" @select="selectDifficulty" />
    <OptionPicker v-model="processPickerOpen" :options="processPickerOptions" :model="form.process" kicker="RECIPE METHOD"
      title="选择制作工艺" desc="使用系统维护的工艺分类，便于后续查找" mode="bottom" @select="selectProcess" />
    <up-picker v-if="unitPickerTarget" :show="unitPickerOpen" :columns="[ingredientUnitOptions(unitPickerTarget)]"
      :default-index="[ingredientUnitIndex(unitPickerTarget)]" title="选择计量单位" cancel-color="#a29388"
      confirm-color="#c93d20" :round="24" @close="closeUnitPicker" @cancel="closeUnitPicker"
      @confirm="confirmUnitPicker" />
    <view class="form-section">
      <view class="section-row"><text class="section-title">步骤</text><text class="add-link" @click="addStep">+
          添加步骤</text></view>
      <StepEditor v-for="(step, index) in steps" :key="step.id" :step="step" :index="index"
        :loading="!!stepAiLoading[step.id]" :suggestion="stepSuggestion(step.id)" :images="stepImages(step)"
        @ai-action="handleStepAiAction(step, index)" @input="handleStepInput(step)"
        @apply-suggestion="applyStepSuggestion(step)" @dismiss-suggestion="dismissStepSuggestion(step.id)"
        @choose-images="chooseStepImages(step)" @remove-image="(imageIndex) => removeStepImage(step, imageIndex)" />
    </view>
    <text v-if="uploading" class="uploading-text">图片上传中...</text>
    <view class="public-row">
      <view><text class="public-title">公开到社区</text><text class="caption">让更多人发现你的拿手菜</text></view>
      <switch :checked="form.isPublic" color="#c93d20" @change="form.isPublic = $event.detail.value" />
    </view>
    <button class="primary-button save-button" @click="save">保存食谱</button>
  </view>
</template>

<style scoped lang="scss">
.edit-page {
  padding-top: 42rpx;
  padding-bottom: 60rpx;
}

.editor-header {
  margin-bottom: 40rpx;
}

.eyebrow {
  display: block;
  color: $ink-eyebrow;
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.page-title {
  display: block;
  margin-top: 14rpx;
  color: $ink;
  font-size: 48rpx;
  font-weight: 700;
}

.page-description {
  display: block;
  margin-top: 10rpx;
  color: $ink-faint;
  font-size: 24rpx;
}

.category-section {
  margin-bottom: 28rpx;
}

.category-label {
  margin-bottom: 0;
}

.category-count {
  color: $ink-faint;
  font-size: 21rpx;
}

.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx 12rpx;
}

.category-option {
  padding: 12rpx 18rpx;
  border: 1rpx solid $line;
  border-radius: $radius-12;
  background: $surface;
  color: $ink-tan;
  font-size: 23rpx;
  transition: background .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.category-option.active {
  border-color: $brand;
  background: $brand-soft;
  color: $brand-dark;
  font-weight: 600;
  box-shadow: $shadow-brand-soft;
}

.category-empty {
  color: $amber;
  font-size: 22rpx;
}

.cover-block {
  margin-top: 8rpx;
}

.cover-block .field-label {
  margin-bottom: 0;
}

.cover-picker {
  height: 300rpx;
  overflow: hidden;
  border-radius: $radius-18;
  background: $surface-soft;
}

.cover-picker image {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: $brand-dark;
  font-size: 25rpx;
}

.field-block {
  flex: 1;
  margin-bottom: 26rpx;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: $ink-field;
  font-size: 23rpx;
}

.ai-status {
  margin-bottom: 12rpx;
  color: $brand-dark;
  font-size: 20rpx;
}

.ai-field-button {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 12rpx;
  color: $brand-dark;
  font-size: 21rpx;
}

.ai-field-button.disabled {
  opacity: .55;
}

.text-input,
.select-input {
  width: 100%;
  height: 78rpx;
  padding: 0 20rpx;
  border: 1rpx solid $line-cool;
  border-radius: $radius-14;
  background: $surface;
  color: $ink;
  font-size: 25rpx;
  line-height: 78rpx;
}

.text-input.large {
  height: 88rpx;
  font-size: 30rpx;
  line-height: 88rpx;
}

.select-input {
  display: flex;
  justify-content: space-between;
}

.field-grid {
  display: flex;
  gap: 18rpx;
}

.form-section {
  margin-top: 28rpx;
}

.uploading-text {
  display: block;
  margin-top: 24rpx;
  color: $brand-dark;
  font-size: 23rpx;
  text-align: center;
}

.public-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 38rpx;
  padding: 24rpx;
  border-radius: $radius-18;
  background: $surface;
}

.public-title {
  color: $ink-deep;
  font-size: 26rpx;
}

.public-row .caption {
  margin-top: 7rpx;
}

.save-button {
  margin-top: 28rpx;
}
</style>
