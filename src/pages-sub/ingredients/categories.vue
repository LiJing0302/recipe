<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CategorySplit from '@/components/CategorySplit.vue'
import { getIngredientsByCategory } from '@/constants/ingredients'
import type { IngredientCategory, IngredientCatalogItem } from '@/constants/ingredients'
import { SYSTEM_CATEGORIES, addIngredientCategory, getAllIngredientCategories, getCatalogCountByCategory, loadIngredientCategories, removeIngredientCategory, renameIngredientCategory } from '@/services/ingredient-category'
import { getIngredientConfig, getIngredientUnit, loadIngredientConfigsRemote, resetIngredientConfig, saveIngredientConfig } from '@/services/ingredient-config'
import type { IngredientConfig, IngredientExtraUnit } from '@/services/ingredient-config'
import type { RecipeCategory } from '@/types'

const categories = ref<string[]>(getAllIngredientCategories())
const activeCategory = ref('')
const editingName = ref('') // 正在编辑的自定义分类名
const draft = ref('') // 新增 / 编辑输入
const showForm = ref(false)
const editing = ref(false)

/** 左侧导航项：名称 + 目录食材数 */
const categoryItems = computed<RecipeCategory[]>(() => categories.value.map((name) => ({ name, count: getCatalogCountByCategory(name) })))

/** 右侧内容：当前分类的目录食材（单位取用户配置优先，保存配置后即时刷新） */
const configVersion = ref(0)
const activeCatalog = computed(() => {
  void configVersion.value
  return getIngredientsByCategory(activeCategory.value as IngredientCategory).map((item) => ({ ...item, unit: getIngredientUnit(item.name, item.unit) }))
})
const isSystem = (name: string) => SYSTEM_CATEGORIES.includes(name as (typeof SYSTEM_CATEGORIES)[number])

const selectCategory = (name: string) => { activeCategory.value = name }
const load = () => {
  categories.value = getAllIngredientCategories()
  if (!categories.value.includes(activeCategory.value)) activeCategory.value = categories.value[0] || ''
}
load()
onMounted(() => { Promise.all([loadIngredientCategories(), loadIngredientConfigsRemote()]).then(([nextCategories]) => { categories.value = nextCategories; load(); configVersion.value++ }).catch(() => undefined) })

const openAdd = () => { editing.value = false; draft.value = ''; showForm.value = true }
const openEdit = (name: string) => { editing.value = true; editingName.value = name; draft.value = name; showForm.value = true }
const closeForm = () => { showForm.value = false; editingName.value = ''; draft.value = '' }

const save = async () => {
  const name = draft.value.trim()
  if (!name) return uni.showToast({ title: '请输入分类名称', icon: 'none' })
  try {
    const ok = editing.value ? await renameIngredientCategory(editingName.value, name) : await addIngredientCategory(name)
    if (!ok) return uni.showToast({ title: '分类已存在或名称无效', icon: 'none' })
  } catch (error) { return uni.showToast({ title: error instanceof Error ? error.message : '保存失败，请检查服务连接', icon: 'none' }) }
  closeForm()
  load()
  uni.showToast({ title: editing.value ? '分类已更新' : '分类已添加', icon: 'success' })
}

const remove = (name: string) => {
  uni.showModal({
    title: '删除分类',
    content: `删除「${name}」后，该分类下的食材将归为「其他」。`,
    confirmColor: '#c93d20',
    success: (result) => {
      if (!result.confirm) return
      removeIngredientCategory(name).then(() => { load(); uni.showToast({ title: '分类已删除', icon: 'success' }) }).catch((error) => uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' }))
    }
  })
}

/* ---------- 食材保鲜配置弹窗 ---------- */
const configOpen = ref(false)
const configTarget = ref<IngredientCatalogItem>()
const configForm = reactive<IngredientConfig>({ extraUnits: [], showExtraUnit: true, roomDays: 0, fridgeDays: 0, frozenDays: 0, fridgeSuitable: true })
const baseUnitValues: Array<NonNullable<IngredientExtraUnit['baseUnit']> | undefined> = [undefined, 'g', 'ml', 'count']
const baseUnitLabels = ['不换算', '克 (g)', '毫升 (ml)', '数量 (count)']
const baseUnitPickerOpen = ref(false)
const baseUnitPickerTarget = ref(-1)
const conversionInputTargets = ref(new Set<number>())
const hasBaseValue = (unit: IngredientExtraUnit) => unit.baseValue !== undefined && unit.baseValue !== null && String(unit.baseValue).trim() !== ''
const baseUnitPickerIndex = computed(() => {
  const targetIndex = baseUnitPickerTarget.value
  const unit = configForm.extraUnits[targetIndex]
  if (!unit || (!hasBaseValue(unit) && !conversionInputTargets.value.has(targetIndex))) return 0
  const index = baseUnitValues.indexOf(unit.baseUnit || 'g')
  return index > 0 ? index : 1
})
const displayExtraUnits = computed(() => {
  const entries = configForm.extraUnits.map((unit, index) => ({ unit, index }))
  const qualitativeIndex = entries.findIndex(({ unit }) => unit.unit.trim() === '适量')
  if (qualitativeIndex <= 0) return entries
  const qualitative = entries[qualitativeIndex]
  return [qualitative, ...entries.slice(0, qualitativeIndex), ...entries.slice(qualitativeIndex + 1)]
})
const baseUnitLabel = (unit: IngredientExtraUnit, index?: number) => hasBaseValue(unit) || (index !== undefined && conversionInputTargets.value.has(index)) ? baseUnitLabels[Math.max(0, baseUnitValues.indexOf(unit.baseUnit || 'g'))] : '不换算'
const baseValuePlaceholder = (unit: IngredientExtraUnit, index?: number) => hasBaseValue(unit) || (index !== undefined && conversionInputTargets.value.has(index)) ? `每${unit.unit || '单位'}对应数值` : '不填写则不换算'

/** 点击食材 chip：打开该食材的配置弹窗（单位 / 克数 / 保鲜时长 / 冰箱适配） */
const openConfig = (item: IngredientCatalogItem) => {
  configTarget.value = item
  const config = getIngredientConfig(item.name, item.category)
  conversionInputTargets.value = new Set(config.extraUnits.reduce<number[]>((targets, unit, index) => {
    if (hasBaseValue(unit)) targets.push(index)
    return targets
  }, []))
  Object.assign(configForm, {
    extraUnits: config.extraUnits.map((unit) => ({ ...unit })),
    showExtraUnit: config.showExtraUnit,
    roomDays: config.roomDays,
    fridgeDays: config.fridgeDays,
    frozenDays: config.frozenDays,
    fridgeSuitable: config.fridgeSuitable
  })
  configOpen.value = true
}
// 关闭动画期间保留标题数据，避免弹层内容高度瞬间收缩导致跳变；下次打开时会覆盖目标。
const closeConfig = () => { configOpen.value = false; baseUnitPickerOpen.value = false; baseUnitPickerTarget.value = -1; conversionInputTargets.value = new Set() }

const addExtraUnit = () => configForm.extraUnits.push({ unit: '', baseUnit: 'g', baseValue: undefined })
const removeExtraUnit = (index: number) => { configForm.extraUnits.splice(index, 1) }
const openBaseUnitPicker = (index: number) => { baseUnitPickerTarget.value = index; baseUnitPickerOpen.value = true }
const closeBaseUnitPicker = () => { baseUnitPickerOpen.value = false; baseUnitPickerTarget.value = -1 }
const selectBaseUnit = (event: { indexs?: number[]; value?: string[] }) => {
  const index = event.indexs?.[0] ?? baseUnitLabels.indexOf(event.value?.[0] || '')
  const targetIndex = baseUnitPickerTarget.value
  const target = configForm.extraUnits[targetIndex]
  if (target) {
    const selectedBaseUnit = baseUnitValues[index]
    if (!selectedBaseUnit) {
      delete target.baseUnit
      delete target.baseValue
      const nextTargets = new Set(conversionInputTargets.value)
      nextTargets.delete(targetIndex)
      conversionInputTargets.value = nextTargets
    } else {
      if (target.baseUnit !== selectedBaseUnit) target.baseValue = undefined
      target.baseUnit = selectedBaseUnit
      conversionInputTargets.value = new Set(conversionInputTargets.value).add(targetIndex)
    }
  }
  closeBaseUnitPicker()
}

const isConversionInputVisible = (index: number) => hasBaseValue(configForm.extraUnits[index]) || conversionInputTargets.value.has(index)

/** 展示额外单位开关：开启用"个/把/份"等计量，关闭退回克(g) */
const toggleExtraUnit = (value: boolean) => {
  configForm.showExtraUnit = value
}

/** 保存配置（多个额外单位 / 保鲜时长 / 冰箱适配） */
const saveConfig = async () => {
  const target = configTarget.value
  if (!target) return
  const toInt = (value: number | undefined) => (Number.isFinite(Number(value)) && Number(value) >= 0) ? Math.floor(Number(value)) : 0
  const extraUnits: IngredientExtraUnit[] = configForm.extraUnits
    .map((item) => ({ unit: item.unit.trim(), ...(hasBaseValue(item) ? { baseUnit: item.baseUnit || 'g', baseValue: item.baseValue } : {}) }))
    .filter((item) => item.unit)
  const unitNames = extraUnits.map((item) => item.unit)
  if (new Set(unitNames).size !== unitNames.length) return uni.showToast({ title: '额外单位不能重复', icon: 'none' })
  for (const item of extraUnits) {
    if (hasBaseValue(item) && (!Number.isFinite(Number(item.baseValue)) || Number(item.baseValue) <= 0)) return uni.showToast({ title: `请输入有效的「${item.unit}」换算值`, icon: 'none' })
  }
  try {
    await saveIngredientConfig(target.name, {
      extraUnits: extraUnits.map((item) => ({ ...item, ...(hasBaseValue(item) ? { baseValue: Number(item.baseValue) } : {}) })),
      showExtraUnit: configForm.showExtraUnit,
      roomDays: toInt(configForm.roomDays),
      fridgeDays: toInt(configForm.fridgeDays),
      frozenDays: toInt(configForm.frozenDays),
      fridgeSuitable: configForm.fridgeSuitable
    }, target.category)
    closeConfig()
    configVersion.value++
    uni.showToast({ title: '配置已保存到云端', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '保存失败，请先登录', icon: 'none' })
  }
}

/** 恢复该食材为系统内置默认 */
const resetConfig = async () => {
  const target = configTarget.value
  if (!target) return
  try {
    await resetIngredientConfig(target.name)
    const config = getIngredientConfig(target.name, target.category)
    Object.assign(configForm, {
      extraUnits: config.extraUnits.map((unit) => ({ ...unit })),
      showExtraUnit: config.showExtraUnit,
      roomDays: config.roomDays,
      fridgeDays: config.fridgeDays,
      frozenDays: config.frozenDays,
      fridgeSuitable: config.fridgeSuitable
    })
    conversionInputTargets.value = new Set(config.extraUnits.reduce<number[]>((targets, unit, index) => {
      if (hasBaseValue(unit)) targets.push(index)
      return targets
    }, []))
    uni.showToast({ title: '已恢复默认配置', icon: 'none' })
    configVersion.value++
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '恢复失败，请先登录', icon: 'none' })
  }
}

/** 红色提示：系统/用户标记为不适合冰箱，却仍设置了冰箱保鲜时长 */
const fridgeWarning = computed(() => {
  if (!configTarget.value) return ''
  if (configForm.fridgeSuitable) return ''
  if (configForm.fridgeDays > 0) return `⚠️ ${configTarget.value.name} 不适合放冰箱，但你设置了冰箱保鲜 ${configForm.fridgeDays} 天——低温可能导致变质或口感变差，建议常温或阴凉干燥处存放。`
  return `⚠️ ${configTarget.value.name} 不适合放冰箱：低温会导致变质或口感变差，建议常温或阴凉干燥处存放。`
})
</script>

<template>
  <view class="category-page">
    <view class="category-head">
      <view><text class="eyebrow">INGREDIENT CATEGORIES</text><text class="page-title">食材分类</text></view>
      <button class="add-category-button" aria-label="新增分类" @click="openAdd"><AppIcon name="plus" size="sm" /><text>新增</text></button>
    </view>

    <CategorySplit
      :categories="categoryItems"
      :active-category="activeCategory"
      :total="activeCatalog.length"
      :total-label="`${activeCatalog.length} 种食材`"
      eyebrow="INGREDIENTS"
      @select="selectCategory"
    >
      <view class="category-results-inner">
        <!-- 目录食材 -->
        <view class="result-section">
          <view class="result-section-head">
            <text class="result-section-title">目录食材</text>
            <text class="result-section-meta">{{ activeCatalog.length }} 种</text>
          </view>
          <view v-if="activeCatalog.length" class="catalog-chips">
            <view v-for="item in activeCatalog" :key="item.name" class="catalog-chip" hover-class="catalog-chip--hover" @click="openConfig(item)">
              <text class="catalog-chip-name">{{ item.name }}</text>
              <text class="catalog-chip-unit">{{ item.unit }}</text>
            </view>
          </view>
          <view v-else class="result-empty">该分类暂无目录食材</view>
        </view>

        <!-- 管理操作 -->
        <view class="result-actions">
          <template v-if="!isSystem(activeCategory)">
            <button class="secondary-button" @click="openEdit(activeCategory)">编辑分类</button>
            <button class="danger-button" @click="remove(activeCategory)">删除分类</button>
          </template>
          <text v-else class="system-hint">系统内置分类，不可编辑</text>
        </view>
      </view>
    </CategorySplit>

    <!-- 新增 / 编辑表单（不用 v-if：关闭时播放收起动画；custom-class 避免 up-popup 在 flex 布局中占位挤压） -->
    <up-popup :show="showForm" custom-class="popup-static" mode="center" @close="closeForm">
      <view class="form-sheet">
        <view class="form-header"><view><text class="form-kicker">{{ editing ? 'EDIT CATEGORY' : 'NEW CATEGORY' }}</text><text class="form-title">{{ editing ? '编辑分类' : '新增分类' }}</text></view><text class="form-close" @click="closeForm">×</text></view>
        <view class="form-field"><text class="field-label">分类名称</text><input v-model="draft" class="field-input" placeholder="例如：酱料" maxlength="8" focus /></view>
        <view class="form-actions"><button class="secondary-button" @click="closeForm">取消</button><button class="primary-button" @click="save">保存</button></view>
      </view>
    </up-popup>

    <!-- 食材保鲜配置弹窗（点击目录食材打开） -->
    <up-popup :show="configOpen" custom-class="popup-static" mode="center" @close="closeConfig">
      <view class="config-sheet">
        <view class="form-header">
          <view><text class="form-kicker">INGREDIENT PRESERVE</text><text class="form-title">{{ configTarget?.name || '' }}</text></view>
          <text class="form-close" @click="closeConfig">×</text>
        </view>
        <text class="config-subtitle">配置「{{ configTarget?.name || '' }}」的分量单位与保鲜方式，保存后全站生效</text>

        <!-- 展示额外单位：单位可配置多个，换算量纲和数值完全由用户填写决定 -->
        <view class="config-fridge-row config-extra-row">
          <view class="config-fridge-copy"><text class="field-label">展示额外单位</text><text class="config-fridge-tip">开：用「个 / 把 / 份」计量；关：按克 (g) 精确计量</text></view>
          <switch :checked="configForm.showExtraUnit" color="#e8542e" @change="toggleExtraUnit($event.detail.value)" />
        </view>
        <view v-if="configForm.showExtraUnit" class="extra-unit-list">
          <view v-for="entry in displayExtraUnits" :key="entry.index" class="extra-unit-row">
            <input v-model="entry.unit.unit" class="field-input extra-unit-name" placeholder="单位，如：把 / 勺 / 杯" maxlength="6" />
            <view class="field-input extra-unit-base-picker" @click="openBaseUnitPicker(entry.index)"><text>{{ baseUnitLabel(entry.unit, entry.index) }}</text><AppIcon name="chevron-right" size="sm" /></view>
            <input v-if="isConversionInputVisible(entry.index)" v-model.number="entry.unit.baseValue" class="field-input extra-unit-value" type="number" :placeholder="baseValuePlaceholder(entry.unit, entry.index)" />
            <view class="extra-unit-remove" aria-label="删除单位" @click="removeExtraUnit(entry.index)"><AppIcon name="trash" size="sm" /></view>
          </view>
          <button class="add-extra-unit" @click="addExtraUnit"><AppIcon name="plus" size="sm" /><text>添加额外单位</text></button>
          <text class="config-conversion-tip">不填写换算值时，该单位仍可用于食谱，但不会参与库存汇总。换算值表示“1 个当前单位 = 多少克 / 毫升 / 个”。</text>
        </view>
        <view v-else class="config-g-only"><text class="field-label">计量单位：克 (g)</text><text class="config-fridge-tip">按克精确计量，无需克数换算</text></view>

        <view class="config-grid">
          <view class="form-field config-field">
            <text class="field-label">常温保鲜（天）</text>
            <input v-model.number="configForm.roomDays" class="field-input" type="number" placeholder="如：2" />
          </view>
          <view class="form-field config-field">
            <text class="field-label">冰箱保鲜（天）</text>
            <input v-model.number="configForm.fridgeDays" class="field-input" type="number" placeholder="如：5" />
          </view>
          <view class="form-field config-field">
            <text class="field-label">冷冻保鲜（天）</text>
            <input v-model.number="configForm.frozenDays" class="field-input" type="number" placeholder="如：90" />
          </view>
        </view>

        <view class="config-fridge-row">
          <view class="config-fridge-copy"><text class="field-label">适合放冰箱</text><text class="config-fridge-tip">不适合的食材建议常温 / 阴凉干燥处存放</text></view>
          <switch :checked="configForm.fridgeSuitable" color="#e8542e" @change="configForm.fridgeSuitable = $event.detail.value" />
        </view>

        <!-- 不适合冰箱的红色提示 -->
        <view v-if="fridgeWarning" class="config-warning">{{ fridgeWarning }}</view>

        <view class="form-actions config-actions">
          <button class="reset-button" @click="resetConfig">恢复默认</button>
          <button class="secondary-button" @click="closeConfig">取消</button>
          <button class="primary-button" @click="saveConfig">保存</button>
        </view>
      </view>
    </up-popup>
    <up-picker
      :show="baseUnitPickerOpen"
      :columns="[baseUnitLabels]"
      :default-index="[baseUnitPickerIndex]"
      title="选择换算基准"
      cancel-color="#a29388"
      confirm-color="#c93d20"
      :round="24"
      @close="closeBaseUnitPicker"
      @cancel="closeBaseUnitPicker"
      @confirm="selectBaseUnit"
    />
  </view>
</template>

<style scoped>
.category-page { display: flex; flex-direction: column; height: calc(100vh - var(--window-top) - var(--window-bottom)); padding: 28rpx 30rpx 20rpx; box-sizing: border-box; background: #fdf8f2; color: #33261e; }
.category-head { display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0; padding: 6rpx 2rpx 22rpx; }
.eyebrow { display: block; color: #b8862f; font-size: 17rpx; letter-spacing: 3rpx; font-weight: 700; }
.page-title { display: block; margin-top: 12rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 50rpx; font-weight: 700; }
.add-category-button { display: flex; align-items: center; justify-content: center; gap: 8rpx; flex-shrink: 0; margin: 0 0 4rpx; padding: 0 26rpx; height: 60rpx; border: 0; border-radius: 999rpx; background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%); color: #fff; font-size: 24rpx; font-weight: 600; line-height: 60rpx; box-shadow: 0 10rpx 22rpx rgba(232, 84, 46, .26); }
.add-category-button .app-icon { color: #fff; }

/* 右侧内容区 */
.category-results-inner { padding-bottom: 20rpx; }
.result-section { margin-top: 18rpx; padding: 22rpx 20rpx; border: 1rpx solid #f0e3d6; border-radius: 20rpx; background: #fff; box-shadow: 0 8rpx 20rpx rgba(214, 96, 44, .05); }
.result-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.result-section-title { color: #33261e; font-size: 26rpx; font-weight: 700; }
.result-section-meta { padding: 4rpx 12rpx; border-radius: 999rpx; background: #f7efe6; color: #b8862f; font-size: 18rpx; }
.catalog-chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.catalog-chip { display: inline-flex; align-items: baseline; gap: 6rpx; padding: 9rpx 16rpx; border-radius: 999rpx; background: #fdf3e9; color: #6f5f54; font-size: 22rpx; transition: background .15s ease, transform .15s ease; }
.catalog-chip--hover { background: #fdeee7; transform: scale(.96); }
.catalog-chip-name { color: #33261e; font-weight: 600; }
.catalog-chip-unit { color: #b8862f; font-size: 17rpx; }
.result-empty { padding: 26rpx 0; color: #c9b8a8; font-size: 22rpx; text-align: center; }
.result-actions { display: flex; gap: 14rpx; margin-top: 24rpx; }
.result-actions button { flex: 1; height: 74rpx; line-height: 74rpx; font-size: 24rpx; }
.secondary-button { border: 1.5rpx solid #f0e3d6; border-radius: 14rpx; background: #fdf8f2; color: #6f5f54; }
.primary-button { border: 0; border-radius: 14rpx; background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%); color: #fff; font-weight: 600; box-shadow: 0 8rpx 16rpx rgba(232, 84, 46, .22); }
.danger-button { border: 1.5rpx solid #f5d9cd; border-radius: 14rpx; background: #fff8f3; color: #c93d20; }
.system-hint { flex: 1; padding: 22rpx 0; color: #c9b8a8; font-size: 21rpx; text-align: center; }

/* 表单弹窗 */
.form-sheet { width: 600rpx; padding: 30rpx 28rpx; box-sizing: border-box; border-radius: 48rpx; background: #fdf8f2; }
.form-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22rpx; }
.form-kicker { display: block; color: #b8862f; font-size: 17rpx; letter-spacing: 2rpx; }
.form-title { display: block; margin-top: 8rpx; color: #33261e; font-size: 32rpx; font-weight: 700; }
.form-close { color: #a29388; font-size: 44rpx; line-height: 36rpx; }
.form-field { margin-top: 12rpx; }
.field-label { display: block; margin-bottom: 8rpx; color: #8a7a70; font-size: 21rpx; }
.field-input { width: 100%; height: 76rpx; padding: 0 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; color: #33261e; font-size: 25rpx; line-height: 76rpx; }
.form-actions { display: flex; gap: 14rpx; margin-top: 26rpx; }
.form-actions button { flex: 1; height: 80rpx; line-height: 80rpx; font-size: 26rpx; }

/* 食材保鲜配置弹窗 */
.config-sheet { width: 640rpx; padding: 30rpx 28rpx; box-sizing: border-box; border-radius: 48rpx; background: #fdf8f2; }
.config-subtitle { display: block; margin-top: 12rpx; color: #a29388; font-size: 20rpx; line-height: 1.5; }
.config-grid { display: flex; gap: 16rpx; }
.config-field { flex: 1; min-width: 0; }
.config-fridge-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18rpx; padding: 18rpx 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; }
.config-extra-row { margin-top: 16rpx; }
.extra-unit-list { margin-top: 14rpx; }
.extra-unit-row { display: flex; align-items: center; gap: 10rpx; margin-top: 10rpx; }
.extra-unit-row:first-child { margin-top: 0; }
.extra-unit-row .field-input { min-width: 0; }
.extra-unit-name { flex: 1; }
.extra-unit-base-picker { display: flex; align-items: center; justify-content: space-between; flex: 1; color: #6f5f54; line-height: 76rpx; }
.extra-unit-base-picker .app-icon { color: #c93d20; transform: rotate(90deg); }
.extra-unit-value { flex: 1; }
.extra-unit-remove { display: flex; align-items: center; justify-content: center; flex: 0 0 58rpx; width: 58rpx; height: 58rpx; border-radius: 12rpx; background: #fff1eb; color: #c93d20; }
.add-extra-unit { display: flex; align-items: center; justify-content: center; gap: 8rpx; width: 100%; height: 68rpx; margin-top: 12rpx; border: 1rpx dashed #e8b8a3; border-radius: 14rpx; background: #fffaf6; color: #c93d20; font-size: 22rpx; line-height: 68rpx; }
.add-extra-unit::after { border: 0; }
.config-conversion-tip { display: block; margin-top: 10rpx; color: #b8862f; font-size: 18rpx; line-height: 1.45; }
.config-g-only { margin-top: 14rpx; padding: 18rpx 20rpx; border: 1rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; }
.config-fridge-copy { flex: 1; min-width: 0; padding-right: 16rpx; }
.config-fridge-tip { display: block; margin-top: 6rpx; color: #a29388; font-size: 18rpx; line-height: 1.4; }
.config-warning { margin-top: 16rpx; padding: 16rpx 18rpx; border: 1.5rpx solid #f5b8a6; border-radius: 14rpx; background: #fff2ec; color: #c2331d; font-size: 21rpx; line-height: 1.55; font-weight: 500; }
.config-actions { margin-top: 24rpx; }
.config-actions .reset-button { flex: 0 0 auto; padding: 0 22rpx; border: 1.5rpx solid #f0e3d6; border-radius: 14rpx; background: #fff; color: #8a7a70; font-size: 23rpx; }
.config-actions .reset-button::after { border: 0; }
</style>
