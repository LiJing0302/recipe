<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { RECIPE_PROCESSES } from '@/constants/recipes'
import { enrichIngredient, amountInputValue, parseIngredientAmount } from '@/services/ingredient-matching'
import { getIngredientUnitOptions } from '@/services/ingredient-config'
import { createRecipeRemote, fetchMyRecipeCategories, fetchRecipe, getRecipeDetail, updateRecipeRemote } from '@/services/recipe'
import { uploadImage } from '@/services/api'
import { getCurrentUser } from '@/services/storage'
import IngredientPicker from '@/components/IngredientPicker.vue'
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
const difficulties: RecipeDifficulty[] = ['简单', '中等', '进阶']
const processes = RECIPE_PROCESSES as readonly RecipeProcess[]
const user = getCurrentUser()
const loading = ref(false)
const uploading = ref(false)
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
const selectDifficulty = (difficulty: RecipeDifficulty | '') => {
  form.difficulty = difficulty
  closeDifficultyPicker()
}
const processPickerOpen = ref(false)
const openProcessPicker = () => { processPickerOpen.value = true }
const closeProcessPicker = () => { processPickerOpen.value = false }
const selectProcess = (process: RecipeProcess) => {
  form.process = process
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
  uni.chooseImage({ count: 1, sourceType: ['album', 'camera'], success: async (result) => {
    uploading.value = true
    try {
      form.cover = (await uploadImage(result.tempFilePaths[0], 'cover')).url
    } catch (error) {
      console.error('[recipe-upload] cover upload failed', error)
      uni.showToast({ title: '主图上传失败，请查看控制台', icon: 'none' })
    } finally {
      uploading.value = false
    }
  } })
}
const chooseStepImages = (step: RecipeStep) => {
  if (uploading.value) return
  uni.chooseImage({ count: 9, sourceType: ['album', 'camera'], success: async (result) => {
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
  } })
}
const removeStepImage = (step: RecipeStep, index: number) => {
  if (step.images?.length) step.images.splice(index, 1)
  else if (index === 0) step.image = undefined
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
    const saved = props.mode === 'edit' ? await updateRecipeRemote(recipe) : await createRecipeRemote(recipe)
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
    <view class="editor-header"><text class="eyebrow">{{ pageEyebrow }}</text><text class="page-title">{{ pageTitle }}</text><text class="page-description">{{ pageDescription }}</text></view>
    <view class="field-block"><text class="field-label">食谱名称</text><input v-model="form.title" class="text-input large" placeholder="填写菜名" /></view>
    <view class="field-block"><text class="field-label">一句话描述</text><input v-model="form.subtitle" class="text-input" placeholder="可选，介绍这道菜的特点" /></view>
    <view class="category-section"><view class="section-row"><text class="field-label category-label">菜谱分类</text><text class="category-count">{{ form.categories.length ? form.categories[0] : '必选' }}</text></view><view v-if="selectableCategories.length" class="category-options"><text v-for="category in selectableCategories" :key="category.id" class="category-option" :class="{ active: form.categories.includes(category.name) }" @click="toggleCategory(category.name)">{{ category.name }}</text></view><text v-else class="category-empty">暂无可用分类，请先检查网络连接</text></view>
    <view class="field-block cover-block"><view class="section-row"><text class="field-label">主图</text><text class="add-link" @click="chooseCover">上传主图</text></view><view class="cover-picker" @click="chooseCover"><image v-if="form.cover" :src="form.cover" mode="aspectFill" /><view v-else class="cover-placeholder">可选，上传一道菜的主图</view></view></view>
    <view class="field-block"><text class="field-label">制作工艺</text><view class="select-input" @click="openProcessPicker"><text>{{ form.process || '请选择制作工艺' }}</text><text>⌄</text></view></view>
    <view class="field-grid"><view class="field-block"><text class="field-label">口味</text><input v-model="form.flavor" class="text-input" placeholder="可选，如酸甜、咸鲜" /></view><view class="field-block"><text class="field-label">难度</text><view class="select-input" @click="openDifficultyPicker"><text>{{ form.difficulty || '请选择难度' }}</text><text>⌄</text></view></view></view>
    <view class="field-grid"><view class="field-block"><text class="field-label">几人份（可选）</text><input v-model="form.servings" type="number" class="text-input" placeholder="可选" /></view><view class="field-block"><text class="field-label">预计时长（分钟，可选）</text><input v-model="form.duration" type="number" class="text-input" placeholder="可选" /></view></view>
    <view class="form-section"><view class="section-row"><text class="section-title">食材</text><text class="add-link" @click="addIngredient">+ 添加食材</text></view><view v-for="ingredient in ingredients" :key="ingredient.id" class="ingredient-line"><view class="line-form"><view class="ingredient-name-field" :class="{ 'is-empty': !ingredient.name }" @click="openIngredientPicker(ingredient)"><text>{{ ingredient.name || '选择食材' }}</text><AppIcon name="chevron-right" size="sm" /></view><view class="amount-field"><input v-model="amountDrafts[ingredient.id]" type="text" placeholder="如：半、1/2、适量" @blur="ingredient.amount = parseIngredientAmount(amountDrafts[ingredient.id], ingredient.name, ingredient.amount.unit)" /><view v-if="ingredient.name" class="amount-unit-picker" @click="openUnitPicker(ingredient)">{{ ingredient.amount.unit || 'g' }}<text class="unit-chevron">⌄</text></view><text v-else class="amount-unit">g</text></view></view></view></view>
    <IngredientPicker :open="pickerOpen" @close="pickerOpen = false" @select="handleSelectIngredient" />
    <up-popup :show="difficultyPickerOpen" custom-class="popup-static" mode="center" :round="24" @close="closeDifficultyPicker">
      <view class="difficulty-modal" @click.stop>
        <view class="difficulty-header"><view><text class="difficulty-eyebrow">RECIPE SETTINGS</text><text class="difficulty-title">选择难度</text><text class="difficulty-desc">根据准备和烹饪复杂度选择</text></view><view class="difficulty-close" @click="closeDifficultyPicker"><AppIcon name="close" size="md" /></view></view>
        <view class="difficulty-options"><view class="difficulty-option" :class="{ active: !form.difficulty }" @click="selectDifficulty('')"><text>暂不设置</text><text v-if="!form.difficulty" class="difficulty-check">✓</text></view><view v-for="difficulty in difficulties" :key="difficulty" class="difficulty-option" :class="{ active: form.difficulty === difficulty }" @click="selectDifficulty(difficulty)"><text>{{ difficulty }}</text><text v-if="form.difficulty === difficulty" class="difficulty-check">✓</text></view></view>
      </view>
    </up-popup>
    <up-popup :show="processPickerOpen" custom-class="popup-static" mode="center" :round="24" @close="closeProcessPicker">
      <view class="difficulty-modal" @click.stop>
        <view class="difficulty-header"><view><text class="difficulty-eyebrow">RECIPE METHOD</text><text class="difficulty-title">选择制作工艺</text><text class="difficulty-desc">使用系统维护的工艺分类，便于后续查找</text></view><view class="difficulty-close" @click="closeProcessPicker"><AppIcon name="close" size="md" /></view></view>
        <view class="difficulty-options"><view v-for="process in processes" :key="process" class="difficulty-option" :class="{ active: form.process === process }" @click="selectProcess(process)"><text>{{ process }}</text><text v-if="form.process === process" class="difficulty-check">✓</text></view></view>
      </view>
    </up-popup>
    <up-picker v-if="unitPickerTarget" :show="unitPickerOpen" :columns="[ingredientUnitOptions(unitPickerTarget)]" :default-index="[ingredientUnitIndex(unitPickerTarget)]" title="选择计量单位" cancel-color="#a29388" confirm-color="#c93d20" :round="24" @close="closeUnitPicker" @cancel="closeUnitPicker" @confirm="confirmUnitPicker" />
    <view class="form-section"><view class="section-row"><text class="section-title">步骤</text><text class="add-link" @click="addStep">+ 添加步骤</text></view><view v-for="(step, index) in steps" :key="step.id" class="step-form"><text class="step-form-index">{{ index + 1 }}</text><view class="step-form-fields"><textarea v-model="step.description" class="step-content-input" placeholder="步骤内容：写下具体做法" /><input v-model="step.tip" class="step-tip-input" placeholder="小贴士（可选）" /><view class="step-image-toolbar"><text class="step-image-label">步骤图片</text><text class="add-link" @click.stop="chooseStepImages(step)">+ 添加图片</text></view><view v-if="stepImages(step).length" class="step-image-grid"><view v-for="(image, imageIndex) in stepImages(step)" :key="image + imageIndex" class="step-image-item"><image :src="image" mode="aspectFill" /><text @click.stop="removeStepImage(step, imageIndex)">删除</text></view></view></view></view></view>
    <text v-if="uploading" class="uploading-text">图片上传中...</text>
    <view class="public-row"><view><text class="public-title">公开到社区</text><text class="caption">让更多人发现你的拿手菜</text></view><switch :checked="form.isPublic" color="#c93d20" @change="form.isPublic = $event.detail.value" /></view>
    <button class="primary-button save-button" @click="save">保存食谱</button>
  </view>
</template>

<style scoped>
.edit-page { padding-top: 42rpx; padding-bottom: 60rpx; }
.editor-header { margin-bottom: 40rpx; }
.eyebrow { display: block; color: #8b948b; font-size: 20rpx; letter-spacing: 2rpx; }
.page-title { display: block; margin-top: 14rpx; color: #33261e; font-size: 48rpx; font-weight: 700; }
.page-description { display: block; margin-top: 10rpx; color: #a29388; font-size: 24rpx; }
.category-section { margin-bottom: 28rpx; }
.category-label { margin-bottom: 0; }
.category-count { color: #a29388; font-size: 21rpx; }
.category-options { display: flex; flex-wrap: wrap; gap: 14rpx 12rpx; }
.category-option { padding: 12rpx 18rpx; border: 1rpx solid #f0e3d6; border-radius: 12rpx; background: #fff; color: #8a7a70; font-size: 23rpx; transition: background .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease; }
.category-option.active { border-color: #e8542e; background: #fdeee7; color: #c93d20; font-weight: 600; box-shadow: 0 4rpx 10rpx rgba(232, 84, 46, .08); }
.category-empty { color: #a36f2b; font-size: 22rpx; }
.cover-block { margin-top: 8rpx; }
.cover-block .field-label { margin-bottom: 0; }
.cover-picker { height: 300rpx; overflow: hidden; border-radius: 18rpx; background: #f7ede3; }
.cover-picker image { width: 100%; height: 100%; }
.cover-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #c93d20; font-size: 25rpx; }
.field-block { flex: 1; margin-bottom: 26rpx; }
.field-label { display: block; margin-bottom: 12rpx; color: #6f7d73; font-size: 23rpx; }
.text-input, .select-input { width: 100%; height: 78rpx; padding: 0 20rpx; border: 1rpx solid #e3e9e1; border-radius: 14rpx; background: #fff; color: #33261e; font-size: 25rpx; line-height: 78rpx; }
.text-input.large { height: 88rpx; font-size: 30rpx; line-height: 88rpx; }
.select-input { display: flex; justify-content: space-between; }
.difficulty-modal { width: 620rpx; max-width: calc(100vw - 64rpx); padding: 32rpx; border: 1rpx solid #f0e3d6; border-radius: 24rpx; background: #fff; box-sizing: border-box; }
.difficulty-header { display: flex; align-items: flex-start; justify-content: space-between; }
.difficulty-eyebrow { display: block; color: #b8862f; font-size: 16rpx; font-weight: 700; letter-spacing: 2rpx; }
.difficulty-title { display: block; margin-top: 8rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 34rpx; font-weight: 700; }
.difficulty-desc { display: block; margin-top: 8rpx; color: #a29388; font-size: 21rpx; line-height: 1.4; }
.difficulty-close { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 16rpx; background: #fff8f3; color: #a29388; }
.difficulty-options { margin-top: 26rpx; }
.difficulty-option { display: flex; align-items: center; justify-content: space-between; min-height: 78rpx; padding: 0 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; color: #6f7d73; font-size: 25rpx; }
.difficulty-option + .difficulty-option { margin-top: 12rpx; }
.difficulty-option.active { border-color: #e8542e; background: #fdeee7; color: #c93d20; font-weight: 600; }
.difficulty-check { font-size: 30rpx; }
.field-grid { display: flex; gap: 18rpx; }
.form-section { margin-top: 28rpx; }
.add-link { color: #c93d20; font-size: 23rpx; }
.line-form { display: flex; gap: 16rpx; margin-top: 16rpx; }
.line-form input { flex: 1; height: 72rpx; padding: 0 18rpx; border-radius: 12rpx; background: #fff; color: #34473f; font-size: 24rpx; box-sizing: border-box; }
/* 分量输入：自带单位标签（选中食材后由公共目录带出） */
.amount-field { display: flex; align-items: center; flex: 1; max-width: 232rpx; min-width: 0; height: 72rpx; overflow: hidden; border-radius: 12rpx; background: #fff; }
.amount-field input { flex: 1; min-width: 0; width: auto; padding: 0 0 0 18rpx; border-radius: 0; background: transparent; }
.amount-unit { flex-shrink: 0; padding: 0 14rpx 0 8rpx; color: #b8862f; font-size: 21rpx; }
.amount-unit-picker { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; height: 72rpx; padding: 0 12rpx 0 8rpx; color: #b8862f; font-size: 21rpx; }
.unit-chevron { color: #c9b8a8; font-size: 22rpx; line-height: 1; }
/* 食材名称：点击弹出选择器 */
.ingredient-name-field { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; flex: 1; min-width: 0; height: 72rpx; padding: 0 18rpx; border-radius: 12rpx; background: #fff; color: #33261e; font-size: 24rpx; }
.ingredient-name-field.is-empty { color: #c9b8a8; }
.ingredient-name-field .app-icon { color: #c9b8a8; transform: rotate(90deg); }
.step-form { display: flex; gap: 16rpx; margin-top: 18rpx; }
.step-form-index { display: flex; align-items: center; justify-content: center; flex: 0 0 44rpx; width: 44rpx; height: 44rpx; border-radius: 50%; background: #dceadd; color: #c93d20; font-size: 22rpx; }
.step-form-fields { flex: 1; }
.step-form-fields input, .step-form-fields textarea { width: 100%; padding: 16rpx; border-radius: 12rpx; background: #fff; color: #34473f; font-size: 24rpx; box-sizing: border-box; }
.step-content-input { height: 120rpx; margin-top: 0 !important; line-height: 1.5; }
.step-tip-input { height: 78rpx; margin-top: 12rpx; line-height: 46rpx; }
.step-image-toolbar { display: flex; align-items: center; justify-content: space-between; margin-top: 18rpx; }
.step-image-label { color: #6f7d73; font-size: 22rpx; }
.step-image-grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.step-image-item { position: relative; width: 132rpx; height: 132rpx; overflow: hidden; border-radius: 12rpx; background: #f7ede3; }
.step-image-item image { width: 100%; height: 100%; }
.step-image-item text { position: absolute; right: 6rpx; bottom: 6rpx; padding: 4rpx 8rpx; border-radius: 8rpx; background: rgba(23,34,30,.68); color: #fff; font-size: 18rpx; }
.uploading-text { display: block; margin-top: 24rpx; color: #c93d20; font-size: 23rpx; text-align: center; }
.public-row { display: flex; align-items: center; justify-content: space-between; margin-top: 38rpx; padding: 24rpx; border-radius: 18rpx; background: #fff; }
.public-title, .public-row .caption { display: block; }
.public-title { color: #34473f; font-size: 26rpx; }
.public-row .caption { margin-top: 7rpx; }
.save-button { margin-top: 28rpx; }
</style>
