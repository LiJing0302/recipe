<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import InventoryBatchForm, { type InventoryBatchDraft } from '@/components/InventoryBatchForm.vue'
import { addInventoryBatch, getFreshness, getInventoryBatches, loadInventoryBatches, removeInventoryBatch, updateInventoryBatch } from '@/services/inventory'
import { filterInventoryByZone, getInventorySourceLabel, getStatusCaption, getStorageModeLabel, groupInventoryBatches, INVENTORY_ZONES, isInventoryZone, type InventoryZone } from '@/services/inventory-view'
import type { IngredientInventoryBatch } from '@/types'

const zone = ref<InventoryZone>('fridge')
const batches = ref<IngredientInventoryBatch[]>([])
const formOpen = ref(false)
const editingBatch = ref<IngredientInventoryBatch>()
const activeFilter = ref<'all' | 'priority' | 'fresh' | 'expired'>('all')
const expandedGroups = ref<Set<string>>(new Set())
const zoneConfig = computed(() => INVENTORY_ZONES[zone.value])
const zoneBatches = computed(() => filterInventoryByZone(batches.value, zone.value))
const groups = computed(() => groupInventoryBatches(zoneBatches.value))
const filteredGroups = computed(() => groups.value.filter((group) => activeFilter.value === 'all' || (activeFilter.value === 'priority' && (group.status === 'expiring' || group.status === 'expired')) || (activeFilter.value === 'fresh' && group.status === 'fresh') || (activeFilter.value === 'expired' && group.status === 'expired')))
const attentionGroups = computed(() => filteredGroups.value.filter((group) => group.status === 'expiring' || group.status === 'expired'))
const regularGroups = computed(() => filteredGroups.value.filter((group) => group.status !== 'expiring' && group.status !== 'expired'))
const freshnessSummary = computed(() => ({ expiring: zoneBatches.value.filter((batch) => getFreshness(batch).status === 'expiring').length }))

const load = async () => { await loadInventoryBatches(); batches.value = [...getInventoryBatches()] }
const openAdd = () => { editingBatch.value = undefined; formOpen.value = true }
const openEdit = (batch: IngredientInventoryBatch) => { editingBatch.value = batch; formOpen.value = true }
const closeForm = () => { formOpen.value = false; editingBatch.value = undefined }
const isExpanded = (key: string) => expandedGroups.value.has(key)
const toggleGroup = (key: string) => {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedGroups.value = next
}
const saveForm = async (draft: InventoryBatchDraft) => {
  const isEditing = Boolean(editingBatch.value)
  try {
    if (editingBatch.value) await updateInventoryBatch(editingBatch.value.id, draft)
    else await addInventoryBatch({ ...draft, sourceType: 'manual' })
    closeForm(); await load()
    uni.showToast({ title: isEditing ? '批次已更新' : '食材已加入库中', icon: 'success' })
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '保存失败，请检查服务连接', icon: 'none' }) }
}
const removeBatch = (batch: IngredientInventoryBatch) => {
  uni.showModal({ title: '删除食材批次', content: `确定删除“${batch.name}”的这一批次吗？`, confirmColor: '#b64f45', success: (result) => {
    if (!result.confirm) return
    removeInventoryBatch(batch.id).then(() => load()).then(() => uni.showToast({ title: '已删除', icon: 'none' })).catch((error) => uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' }))
  } })
}

onLoad((options) => { if (isInventoryZone(options?.zone)) zone.value = options.zone })
onShow(load)
</script>

<template>
  <view class="page-shell storage-page">
    <view class="storage-topbar"><view class="storage-heading"><text class="eyebrow">KITCHEN STORAGE</text><text class="page-title">{{ zoneConfig.title }}</text></view><button class="add-button" aria-label="添加食材" @click="openAdd"><AppIcon name="plus" size="sm" />添加</button></view>
    <view class="zone-intro"><text class="zone-description">{{ zoneConfig.description }}</text><view class="zone-summary"><text>{{ groups.length }} 种</text><text>{{ freshnessSummary.expiring }} 项临期</text></view></view>
    <view class="filter-tabs" role="tablist"><text class="filter-tab" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">全部</text><text class="filter-tab" :class="{ active: activeFilter === 'priority' }" @click="activeFilter = 'priority'">优先使用</text><text class="filter-tab" :class="{ active: activeFilter === 'fresh' }" @click="activeFilter = 'fresh'">新鲜</text><text class="filter-tab" :class="{ active: activeFilter === 'expired' }" @click="activeFilter = 'expired'">已过期</text></view>
    <view v-if="filteredGroups.length" class="inventory-content">
      <view v-if="attentionGroups.length" class="ingredient-section"><view class="section-heading"><view><text class="section-title">优先使用</text><text class="section-desc">临期和过期批次需要及时处理</text></view><text class="section-count">{{ attentionGroups.length }} 种</text></view><view v-for="group in attentionGroups" :key="group.key" class="ingredient-card surface" :class="{ expanded: isExpanded(group.key) }"><view class="ingredient-card-head" @click="toggleGroup(group.key)"><view class="ingredient-status-dot" :class="`dot-${group.status}`" /><view class="ingredient-card-main"><text class="ingredient-card-name">{{ group.name }}</text><text class="ingredient-card-meta">{{ group.batches.length }} 个批次 · 最近购入 {{ group.latestPurchasedAt.slice(0, 10) }}</text></view><view class="ingredient-card-status"><text class="freshness" :class="`freshness-${group.status}`">{{ group.statusLabel }}</text><text class="status-caption">{{ getStatusCaption(group) }}</text></view><AppIcon name="chevron-right" size="sm" class="expand-icon" /></view><view v-if="isExpanded(group.key)" class="batch-details"><view v-for="batch in group.batches" :key="batch.id" class="batch-row"><view class="batch-main"><text class="batch-name">{{ batch.name }}</text><text class="batch-date">购入 {{ batch.purchasedAt.slice(0, 10) }} · {{ getStorageModeLabel(batch.storageMode) }} · {{ getInventorySourceLabel(batch) }}</text></view><text class="freshness" :class="`freshness-${getFreshness(batch).status}`">{{ getFreshness(batch).label }}</text><view class="batch-actions"><AppIcon name="pencil" size="sm" @click.stop="openEdit(batch)" /><AppIcon name="trash" size="sm" @click.stop="removeBatch(batch)" /></view></view></view></view></view>
      <view v-if="regularGroups.length" class="ingredient-section"><view class="section-heading"><view><text class="section-title">其他食材</text><text class="section-desc">按最近购入时间排列</text></view><text class="section-count">{{ regularGroups.length }} 种</text></view><view v-for="group in regularGroups" :key="group.key" class="ingredient-card surface" :class="{ expanded: isExpanded(group.key) }"><view class="ingredient-card-head" @click="toggleGroup(group.key)"><view class="ingredient-status-dot" :class="`dot-${group.status}`" /><view class="ingredient-card-main"><text class="ingredient-card-name">{{ group.name }}</text><text class="ingredient-card-meta">{{ group.batches.length }} 个批次 · 最近购入 {{ group.latestPurchasedAt.slice(0, 10) }}</text></view><view class="ingredient-card-status"><text class="freshness" :class="`freshness-${group.status}`">{{ group.statusLabel }}</text><text class="status-caption">{{ getStatusCaption(group) }}</text></view><AppIcon name="chevron-right" size="sm" class="expand-icon" /></view><view v-if="isExpanded(group.key)" class="batch-details"><view v-for="batch in group.batches" :key="batch.id" class="batch-row"><view class="batch-main"><text class="batch-name">{{ batch.name }}</text><text class="batch-date">购入 {{ batch.purchasedAt.slice(0, 10) }} · {{ getStorageModeLabel(batch.storageMode) }} · {{ getInventorySourceLabel(batch) }}</text></view><text class="freshness" :class="`freshness-${getFreshness(batch).status}`">{{ getFreshness(batch).label }}</text><view class="batch-actions"><AppIcon name="pencil" size="sm" @click.stop="openEdit(batch)" /><AppIcon name="trash" size="sm" @click.stop="removeBatch(batch)" /></view></view></view></view></view>
    </view>
    <view v-else class="empty-state storage-empty"><view class="empty-icon"><AppIcon name="leaf" size="lg" /></view><text class="empty-title">{{ zoneConfig.emptyTitle }}</text><text class="empty-desc">{{ zoneConfig.emptyDescription }}</text><button class="primary-button empty-button" @click="openAdd">添加食材</button></view>
    <InventoryBatchForm :open="formOpen" :batch="editingBatch" :title="editingBatch ? '编辑食材批次' : '添加食材'" @close="closeForm" @save="saveForm" />
  </view>
</template>

<style scoped>
.storage-page { padding-top: 24rpx; padding-bottom: 126rpx; }
.storage-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding: 10rpx 2rpx 20rpx; }
.storage-heading { flex: 1; min-width: 0; }
.eyebrow { display: block; color: #b8862f; font-size: 17rpx; font-weight: 700; letter-spacing: 2rpx; }
.page-title { display: block; margin-top: 6rpx; color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 42rpx; font-weight: 700; }
.add-button { display: flex; align-items: center; justify-content: center; gap: 7rpx; padding: 0 20rpx; height: 58rpx; border: 0; border-radius: 999rpx; background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%); color: #fff; font-size: 22rpx; font-weight: 600; line-height: 58rpx; box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .23); }
.add-button .app-icon { color: #fff; }
.zone-intro { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 18rpx 20rpx; border: 1rpx solid #f0e3d6; border-radius: 18rpx; background: #fffaf5; }
.zone-description { flex: 1; color: #8a7a70; font-size: 21rpx; line-height: 1.5; }
.zone-summary { display: flex; flex-direction: column; align-items: flex-end; gap: 5rpx; flex-shrink: 0; color: #b8862f; font-size: 19rpx; white-space: nowrap; }
.zone-summary text:last-child { color: #c67550; }
.filter-tabs { display: flex; gap: 8rpx; margin-top: 18rpx; overflow-x: auto; }
.filter-tab { flex: 0 0 auto; padding: 11rpx 18rpx; border: 1rpx solid #f0e3d6; border-radius: 999rpx; background: #fff; color: #a29388; font-size: 20rpx; white-space: nowrap; }
.filter-tab.active { border-color: #e9a13b; background: #fdf3e0; color: #b8862f; font-weight: 650; }
.inventory-content { margin-top: 26rpx; }
.ingredient-section + .ingredient-section { margin-top: 34rpx; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; padding: 0 4rpx 12rpx; }
.section-title { color: #33261e; font-family: Georgia, 'Songti SC', serif; font-size: 29rpx; font-weight: 700; }
.section-desc, .section-count { color: #a29388; font-size: 19rpx; }
.section-desc { display: block; margin-top: 4rpx; }
.ingredient-card { margin-bottom: 14rpx; overflow: hidden; border-color: #f0e3d6; box-shadow: 0 10rpx 24rpx rgba(232, 84, 46, .05); }
.ingredient-card-head { display: flex; align-items: center; gap: 12rpx; min-height: 104rpx; padding: 16rpx 18rpx; }
.ingredient-card-head:active { background: #fffaf5; }
.ingredient-status-dot { width: 12rpx; height: 12rpx; flex-shrink: 0; border-radius: 50%; }
.dot-fresh { background: #6c9b73; }
.dot-normal { background: #e1a54e; }
.dot-expiring { background: #df714e; }
.dot-expired { background: #a95752; }
.ingredient-card-main { flex: 1; min-width: 0; }
.ingredient-card-name, .ingredient-card-meta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ingredient-card-name { color: #6f5f54; font-size: 27rpx; font-weight: 700; }
.ingredient-card-meta { margin-top: 7rpx; color: #a29388; font-size: 19rpx; }
.ingredient-card-status { display: flex; flex-direction: column; align-items: flex-end; gap: 5rpx; flex-shrink: 0; }
.status-caption { color: #a29388; font-size: 17rpx; white-space: nowrap; }
.expand-icon { flex-shrink: 0; color: #b6a79b; transition: transform .2s ease; }
.ingredient-card.expanded .expand-icon { transform: rotate(90deg); }
.batch-details { padding: 0 18rpx; border-top: 1rpx solid #f5e9dd; background: #fffaf5; }
.batch-row { display: flex; align-items: center; gap: 12rpx; min-height: 84rpx; padding: 14rpx 0; border-bottom: 1rpx solid #f5e9dd; }
.batch-row:last-child { border-bottom: 0; }
.batch-main { flex: 1; min-width: 0; }
.batch-name, .batch-date { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.batch-name { color: #6f5f54; font-size: 23rpx; }
.batch-date { margin-top: 6rpx; color: #a29388; font-size: 18rpx; }
.freshness { flex-shrink: 0; padding: 4rpx 8rpx; border-radius: 8rpx; font-size: 17rpx; }
.freshness-fresh { background: #eef4e8; color: #64894a; }
.freshness-normal { background: #fdf3e0; color: #b8862f; }
.freshness-expiring { background: #fdeee7; color: #c93d20; }
.freshness-expired { background: #f5e9e8; color: #a95752; }
.batch-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; color: #a29388; }
.batch-actions .app-icon:last-child { color: #c98d6f; }
.storage-empty { padding-top: 100rpx; text-align: center; }
.empty-icon { display: flex; align-items: center; justify-content: center; width: 112rpx; height: 112rpx; margin: 0 auto; border-radius: 32rpx; background: #fdeee7; color: #e8542e; }
.empty-title { display: block; margin-top: 26rpx; color: #33261e; font-size: 31rpx; font-weight: 750; }
.empty-desc { display: block; max-width: 560rpx; margin: 12rpx auto 0; color: #a29388; font-size: 23rpx; line-height: 1.7; }
.empty-button { width: 300rpx; margin: 28rpx auto 0; }
</style>
