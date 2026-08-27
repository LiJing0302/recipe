<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import InventoryBatchForm, { type InventoryBatchDraft } from '@/components/InventoryBatchForm.vue'
import { INGREDIENTS_KITCHEN_CONFIG, kitchenZoneConfigs } from '@/config/ingredients-kitchen'
import { addInventoryBatch, getFreshness, getInventoryBatches, loadInventoryBatches, updateInventoryBatch } from '@/services/inventory'
import { filterInventoryByZone, groupInventoryBatches, type IngredientGroup, type InventoryZone } from '@/services/inventory-view'
import { hideFloatingTabBar, showFloatingTabBar } from '@/services/tabbar'
import { withLoginRequired } from '@/services/auth-guard'
import type { IngredientInventoryBatch } from '@/types'

const props = defineProps<{ active: boolean }>()

const batches = ref<IngredientInventoryBatch[]>([])
const loaded = ref(false)
const formOpen = ref(false)
const editingBatch = ref<IngredientInventoryBatch>()
type FridgeInteraction = 'idle' | 'opening' | 'opened' | 'closing'
const fridgeInteraction = ref<FridgeInteraction>('idle')
const kitchenConfig = INGREDIENTS_KITCHEN_CONFIG
const kitchenZones = kitchenZoneConfigs
const fridgeAlignmentDebug = import.meta.env.DEV && kitchenConfig.fridgeVideo.debugPreview.enabled
const fridgeVideoActive = ref(false)
let fridgeVideoContext: ReturnType<typeof uni.createVideoContext> | null = null
let fridgeReverseTimer: ReturnType<typeof setInterval> | null = null
let fridgeVideoCurrentTime = 0
let fridgeVideoDuration = 0
const zoneKeys: InventoryZone[] = kitchenZones.map((zone) => zone.key)
const kitchenCssVars = {
	'--kitchen-bg-color': kitchenConfig.background.color,
	'--kitchen-main-width': `min(100%, calc((100vh - var(--window-bottom)) * ${kitchenConfig.background.main.widthByViewportHeight}))`,
	'--kitchen-main-aspect-ratio': kitchenConfig.background.main.aspectRatio,
	'--kitchen-blank-height': `max(0px, calc((100% - ${kitchenConfig.background.main.canvasWidthVw}vw) / 2))`,
	'--kitchen-canvas-transform': kitchenConfig.canvasAnimation.default.transform,
	'--kitchen-canvas-focus-transform': kitchenConfig.canvasAnimation.fridgeFocus.transform,
	'--kitchen-canvas-transform-origin': kitchenConfig.canvasAnimation.transformOrigin,
	'--kitchen-canvas-transition': `${kitchenConfig.canvasAnimation.durationMs}ms ${kitchenConfig.canvasAnimation.easing}`,
	'--kitchen-overlay-transition': `${kitchenConfig.overlay.fadeDurationMs}ms ease`,
	'--kitchen-background-blur': kitchenConfig.backgroundBlur.opened,
	'--kitchen-background-transition': `${kitchenConfig.backgroundBlur.transitionDurationMs}ms ease`,
	'--kitchen-background-opacity-transition': `${kitchenConfig.backgroundReveal.opacityDurationMs}ms ease`,
	'--fridge-video-anchor-x': kitchenConfig.fridgeVideo.anchor.x,
	'--fridge-video-anchor-y': kitchenConfig.fridgeVideo.anchor.y,
	'--fridge-video-width': kitchenConfig.fridgeVideo.width,
	'--fridge-video-aspect-ratio': kitchenConfig.fridgeVideo.aspectRatio,
	'--fridge-video-scale': String(kitchenConfig.fridgeVideo.scale),
	'--fridge-video-opened-opacity': String(kitchenConfig.fridgeVideo.openedOpacity),
	'--fridge-video-debug-opacity': String(kitchenConfig.fridgeVideo.debugPreview.opacity),
	'--fridge-video-transition': `${kitchenConfig.fridgeVideo.transitionDurationMs}ms ease`,
	'--fridge-video-reveal-duration': `${kitchenConfig.fridgeVideo.reveal.durationMs}ms ${kitchenConfig.fridgeVideo.reveal.easing}`
}
const getZoneHotspotStyle = (zone: (typeof kitchenZones)[number]) => zone.hotspot
type ZoneStats = { groups: IngredientGroup[]; fresh: number; expiring: number; expired: number }
const zoneStats = computed<Record<InventoryZone, ZoneStats>>(() => {
	const result = {} as Record<InventoryZone, ZoneStats>
	zoneKeys.forEach((zone) => {
		const groups = groupInventoryBatches(filterInventoryByZone(batches.value, zone))
		result[zone] = {
			groups,
			fresh: groups.filter((group) => group.status === 'fresh').length,
			expiring: groups.filter((group) => group.status === 'expiring').length,
			expired: groups.filter((group) => group.status === 'expired').length
		}
	})
	return result
})
const getZoneStats = (zone: InventoryZone) => zoneStats.value[zone]
const fridgeGroups = computed(() => getZoneStats('fridge').groups)
const load = async () => { await loadInventoryBatches(); batches.value = [...getInventoryBatches()]; loaded.value = true }
const openAdd = withLoginRequired(() => { editingBatch.value = undefined; formOpen.value = true })
const closeForm = () => { formOpen.value = false; editingBatch.value = undefined }
const openCategories = withLoginRequired(() => uni.navigateTo({ url: '/pages-sub/ingredients/categories' }))
const openZone = withLoginRequired((zone: InventoryZone) => uni.navigateTo({ url: `/pages-sub/ingredients/storage?zone=${zone}` }))
const resetFridgeAnimation = () => {
	if (fridgeReverseTimer) clearInterval(fridgeReverseTimer)
	fridgeReverseTimer = null
	fridgeVideoContext?.stop()
	fridgeVideoContext = null
	fridgeVideoActive.value = false
	fridgeInteraction.value = 'idle'
	showFloatingTabBar()
}
const closeFridgeAnimation = () => {
	if (fridgeInteraction.value === 'idle' || fridgeInteraction.value === 'closing') return
	if (fridgeInteraction.value !== 'opened') {
		resetFridgeAnimation()
		return
	}

	fridgeInteraction.value = 'closing'
	fridgeVideoContext?.pause()
	let reverseTime = Math.max(fridgeVideoCurrentTime, fridgeVideoDuration, kitchenConfig.fridgeReverse.fallbackDurationSeconds)
	fridgeVideoContext?.seek(reverseTime)
	fridgeReverseTimer = setInterval(() => {
		reverseTime -= kitchenConfig.fridgeReverse.stepSeconds
		if (reverseTime <= 0) {
			fridgeVideoContext?.seek(0)
			resetFridgeAnimation()
			return
		}
		fridgeVideoContext?.seek(reverseTime)
	}, kitchenConfig.fridgeReverse.tickMs)
}
const startFridgeVideo = () => {
	hideFloatingTabBar()
	fridgeVideoContext = uni.createVideoContext('fridge-open-video')
	fridgeVideoActive.value = true
	fridgeVideoCurrentTime = 0
	fridgeVideoDuration = 0
	fridgeVideoContext?.playbackRate(kitchenConfig.fridgeVideo.playbackRate)
	fridgeVideoContext.play()
}
const openFridge = withLoginRequired(() => {
	if (fridgeInteraction.value !== 'idle') return
	fridgeInteraction.value = 'opening'
	nextTick(startFridgeVideo)
})
const handleFridgeVideoTimeUpdate = (event: { detail?: { currentTime?: number; duration?: number } }) => {
	const currentTime = event.detail?.currentTime
	const duration = event.detail?.duration
	if (typeof currentTime === 'number') fridgeVideoCurrentTime = currentTime
	if (typeof duration === 'number' && duration > 0) fridgeVideoDuration = duration
}
const handleFridgeVideoEnded = () => { fridgeInteraction.value = 'opened' }
const handleFridgeVideoError = () => { fridgeVideoActive.value = false; fridgeInteraction.value = 'opened' }
const openFridgeList = () => { resetFridgeAnimation(); openZone('fridge') }
const handleZoneClick = (zone: InventoryZone) => {
	if (zone === 'fridge') openFridge()
	else openZone(zone)
}
const setPageScrollLock = (locked: boolean) => {
	// #ifdef H5
	if (typeof document !== 'undefined') {
		document.documentElement.style.overflow = locked ? 'hidden' : ''
		document.body.style.overflow = locked ? 'hidden' : ''
	}
	// #endif
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
watch(() => props.active, (active) => {
	setPageScrollLock(active)
	if (active) {
		showFloatingTabBar()
		if (!loaded.value) void load()
	} else {
		resetFridgeAnimation()
	}
}, { immediate: true })
defineExpose({ refresh: load })
</script>

<template>
	<view class="kitchen-page" :style="kitchenCssVars">
		<view class="kitchen-scene"
			:class="{ 'is-fridge-opening': fridgeInteraction === 'opening', 'is-fridge-opened': fridgeInteraction === 'opened', 'is-video-active': fridgeVideoActive, 'is-fridge-debug-preview': fridgeAlignmentDebug }"
			aria-label="厨房食材存放区域">
			<view class="kitchen-media-canvas">
				<view class="kitchen-background">
					<view class="kitchen-top-blank">
						<image class="kitchen-top-blank-image" :src="kitchenConfig.background.topBlank.src"
							mode="scaleToFill" />
					</view>
					<view class="kitchen-bottom-floor">
						<image class="kitchen-bottom-floor-image" :src="kitchenConfig.background.bottomFloor.src"
							mode="scaleToFill" />
					</view>
					<view class="kitchen-main-region">
						<image class="kitchen-main-image" :src="kitchenConfig.background.main.src" mode="scaleToFill" />
						<video v-if="fridgeAlignmentDebug || fridgeInteraction !== 'idle'" id="fridge-open-video"
							class="fridge-animation-video" :src="kitchenConfig.fridgeVideo.src" :autoplay="false"
							:controls="false" :show-center-play-btn="false" :show-fullscreen-btn="false"
							:show-play-btn="false" :show-mute-btn="false" :enable-progress-gesture="false"
							:object-fit="kitchenConfig.fridgeVideo.objectFit"
							:object-position="kitchenConfig.fridgeVideo.objectPosition" muted playsinline
							@timeupdate="handleFridgeVideoTimeUpdate" @ended="handleFridgeVideoEnded"
							@error="handleFridgeVideoError" />
						<view class="main-overlay">
							<view v-for="zone in kitchenZones" :key="zone.key" class="scene-hotspot"
								:style="getZoneHotspotStyle(zone)" :aria-label="zone.ariaLabel"
								@click="handleZoneClick(zone.key)">
								<view class="zone-panel">
									<view class="zone-heading"><text class="zone-code">{{ zone.code }}</text><text
											class="zone-name">{{ zone.name }}</text></view>
									<view class="zone-count"><text>{{ getZoneStats(zone.key).groups.length
											}}</text><text>种食材</text>
									</view>
									<view class="zone-status">
										<view class="status-item fresh">
											<text>新鲜</text><text>{{ getZoneStats(zone.key).fresh }}</text>
										</view>
										<view class="status-item expiring">
											<text>临期</text><text>{{ getZoneStats(zone.key).expiring }}</text>
										</view>
										<view class="status-item expired">
											<text>过期</text><text>{{ getZoneStats(zone.key).expired }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view class="scene-overlay">
				<view class="scene-topbar">
					<view class="brand-block"><text class="eyebrow">MY KITCHEN</text><text
							class="page-title">食材库</text><text class="page-desc">家里的食材，按所在位置找到</text></view>
					<view class="scene-actions">
						<view class="category-entry" aria-label="食材分类" @click="openCategories">
							<AppIcon name="settings" size="sm" /><text>分类</text>
						</view><button class="add-button" aria-label="添加食材" @click="openAdd">
							<AppIcon name="plus" size="sm" />添加
						</button>
					</view>
				</view>
				<view class="scene-footer">
					<AppIcon name="leaf" size="sm" /><text>点击区域查看全部食材</text>
				</view>
			</view>
		</view>
		<view v-if="fridgeInteraction !== 'idle'" class="fridge-animation-layer"
			:class="{ 'is-opening': fridgeInteraction === 'opening', 'is-opened': fridgeInteraction === 'opened', 'is-closing': fridgeInteraction === 'closing' }"
			@click.self="closeFridgeAnimation">
			<view class="fridge-animation-close" aria-label="关闭冰箱动画" @click="closeFridgeAnimation">
				<AppIcon name="close" size="md" />
			</view>
			<view v-if="fridgeInteraction === 'opened'" class="fridge-food-sheet" @click.stop>
				<view class="fridge-sheet-handle" />
				<view class="fridge-sheet-header">
					<view><text class="fridge-sheet-kicker">INSIDE THE FRIDGE</text><text
							class="fridge-sheet-title">冰箱里的食材</text><text class="fridge-sheet-caption">{{
								fridgeGroups.length }} 种食材，按优先使用顺序排列</text></view>
					<view class="fridge-sheet-count">{{ fridgeGroups.length }}</view>
				</view>
				<scroll-view scroll-y class="fridge-food-list">
					<view v-for="group in fridgeGroups" :key="group.key" class="fridge-food-row">
						<view class="fridge-food-status" :class="group.status" />
						<view class="fridge-food-main"><text class="fridge-food-name">{{ group.name }}</text><text
								class="fridge-food-meta">{{ group.batches.length }} 个批次 · {{ group.statusLabel }}</text>
						</view>
						<AppIcon name="chevron-right" size="sm" />
					</view>
					<view v-if="!fridgeGroups.length" class="fridge-food-empty">
						<AppIcon name="snowflake" size="md" /><text>冰箱里还没有记录食材</text>
					</view>
				</scroll-view>
				<button class="fridge-list-button" @click="openFridgeList">查看全部冰箱食材</button>
			</view>
		</view>
		<InventoryBatchForm :open="formOpen" :batch="editingBatch" :title="editingBatch ? '编辑食材批次' : '添加食材'"
			@close="closeForm" @save="saveForm" />
	</view>
</template>

<style scoped>
.kitchen-page {
	/* 使用统一原生导航栏后，厨房画布从 header 下方开始计算高度。 */
	height: calc(100vh - var(--window-top) - var(--window-bottom));
	min-height: 0;
	padding: 0;
	overflow: hidden;
	background: var(--kitchen-bg-color);
}

.kitchen-scene {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: var(--kitchen-bg-color);
}

.kitchen-media-canvas {
	position: absolute;
	inset: 0;
	transform: var(--kitchen-canvas-transform);
	transform-origin: var(--kitchen-canvas-transform-origin);
	transition: transform var(--kitchen-canvas-transition);
}

.kitchen-background {
	position: absolute;
	inset: 0;
}

.kitchen-top-blank,
.kitchen-bottom-floor {
	position: absolute;
	right: 0;
	left: 0;
	height: var(--kitchen-blank-height);
	overflow: hidden;
	background: var(--kitchen-bg-color);
}

.kitchen-top-blank {
	top: 0;
}

.kitchen-bottom-floor {
	bottom: 0;
}

.kitchen-top-blank-image {
	display: block;
	width: 100%;
	height: 100%;
}

.kitchen-bottom-floor-image {
	display: block;
	width: 100%;
	height: 100%;
}

.kitchen-main-region {
	position: absolute;
	top: 50%;
	left: 50%;
	width: var(--kitchen-main-width);
	aspect-ratio: var(--kitchen-main-aspect-ratio);
	transform: translate(-50%, -50%);
}

.kitchen-main-image {
	display: block;
	width: 100%;
	height: 100%;
}

.main-overlay {
	position: absolute;
	inset: 0;
	z-index: 3;
}

.kitchen-scene.is-fridge-opening .kitchen-media-canvas,
.kitchen-scene.is-fridge-opened .kitchen-media-canvas {
	transform: var(--kitchen-canvas-focus-transform);
}

.kitchen-scene.is-fridge-opening .main-overlay,
.kitchen-scene.is-fridge-opening .scene-overlay,
.kitchen-scene.is-fridge-opened .main-overlay,
.kitchen-scene.is-fridge-opened .scene-overlay,
.kitchen-scene.is-fridge-closing .main-overlay,
.kitchen-scene.is-fridge-closing .scene-overlay {
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
	transition: opacity var(--kitchen-overlay-transition), visibility 0s linear var(--kitchen-overlay-transition);
}

.kitchen-scene.is-fridge-opened .kitchen-background {
	opacity: 1;
	transition: opacity var(--kitchen-background-opacity-transition), filter var(--kitchen-background-transition);
}

.kitchen-scene.is-fridge-opened .kitchen-top-blank-image,
.kitchen-scene.is-fridge-opened .kitchen-main-image,
.kitchen-scene.is-fridge-opened .kitchen-bottom-floor-image {
	filter: blur(var(--kitchen-background-blur));
}

.kitchen-top-blank-image,
.kitchen-main-image,
.kitchen-bottom-floor-image {
	transition: filter 900ms ease;
}

.scene-overlay {
	position: absolute;
	inset: 0;
	z-index: 10;
	pointer-events: none;
}

.scene-topbar {
	position: absolute;
	top: 12rpx;
	left: 4%;
	right: 4%;
	min-height: 84rpx;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.brand-block {
	max-width: 60%;
	padding: 16rpx 20rpx 18rpx;
	border: 1rpx solid rgba(255, 255, 255, .62);
	border-radius: 20rpx;
	background: rgba(255, 249, 240, .78);
	box-shadow: 0 8rpx 24rpx rgba(84, 54, 31, .12);
}

.eyebrow {
	display: block;
	color: #9c692e;
	font-size: 17rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
}

.page-title {
	display: block;
	margin-top: 7rpx;
	color: #33261e;
	font-family: Georgia, 'Songti SC', serif;
	font-size: 44rpx;
	font-weight: 700;
}

.page-desc {
	display: block;
	margin-top: 5rpx;
	color: #77675a;
	font-size: 20rpx;
}

.scene-actions {
	display: flex;
	align-items: center;
	gap: 8rpx;
	flex-shrink: 0;
	padding: 10rpx;
	border: 1rpx solid rgba(255, 255, 255, .58);
	border-radius: 18rpx;
	background: rgba(255, 249, 240, .72);
	box-shadow: 0 8rpx 24rpx rgba(84, 54, 31, .12);
}

.category-entry {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5rpx;
	min-height: 52rpx;
	padding: 0 12rpx;
	border: 1rpx solid rgba(156, 105, 46, .28);
	border-radius: 12rpx;
	color: #805d39;
	font-size: 19rpx;
}

.category-entry .app-icon {
	color: #a3682e;
}

.add-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	width: auto !important;
	min-width: 118rpx;
	padding: 0 16rpx;
	height: 52rpx;
	border: 0;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #ff8a3d 0%, #d64b2c 100%);
	color: #fff;
	font-size: 20rpx;
	font-weight: 650;
	line-height: 52rpx;
	box-shadow: 0 7rpx 16rpx rgba(174, 63, 32, .28);
}

.add-button .app-icon {
	color: #fff;
}

.scene-topbar,
.scene-footer {
	pointer-events: auto;
}

.scene-hotspot {
	position: absolute;
	border: 2rpx solid rgba(255, 255, 255, .14);
	border-radius: 22rpx;
	transition: background .18s ease, border-color .18s ease;
}

.scene-hotspot:active {
	border-color: rgba(255, 255, 255, .82);
	background: rgba(255, 255, 255, .14);
}

.zone-panel {
	position: absolute;
	right: 7%;
	bottom: 7%;
	left: 7%;
	padding: 13rpx;
	overflow: hidden;
	border: 1rpx solid rgba(255, 255, 255, .3);
	border-radius: 17rpx;
	background: rgba(48, 34, 24, .76);
	color: #fff;
	box-shadow: 0 8rpx 20rpx rgba(39, 25, 15, .18);
}

.zone-heading {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 6rpx;
}

.zone-code {
	overflow: hidden;
	color: #f6d49e;
	font-size: 13rpx;
	font-weight: 700;
	letter-spacing: 1.5rpx;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.zone-name {
	flex-shrink: 0;
	font-size: 21rpx;
	font-weight: 700;
}

.zone-count {
	display: flex;
	align-items: baseline;
	gap: 4rpx;
	margin-top: 8rpx;
}

.zone-count text:first-child {
	font-size: 29rpx;
	font-weight: 750;
	line-height: 1;
}

.zone-count text:last-child {
	color: rgba(255, 255, 255, .8);
	font-size: 16rpx;
}

.zone-status {
	display: flex;
	flex-wrap: wrap;
	gap: 6rpx 10rpx;
	margin-top: 10rpx;
}

.status-item {
	display: flex;
	align-items: center;
	gap: 4rpx;
	color: rgba(255, 255, 255, .82);
	font-size: 15rpx;
	white-space: nowrap;
}

.status-item text:last-child {
	font-size: 18rpx;
	font-weight: 700;
}

.status-item.fresh text:last-child {
	color: #c9e3ae;
}

.status-item.expiring text:last-child {
	color: #ffd38b;
}

.status-item.expired text:last-child {
	color: #ffb0a2;
}

.scene-footer {
	position: absolute;
	right: 0;
	bottom: 1.5%;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	color: rgba(255, 255, 255, .92);
	font-size: 19rpx;
	text-shadow: 0 2rpx 5rpx rgba(54, 35, 21, .45);
}

.scene-footer .app-icon {
	color: #fff0cc;
}

.fridge-animation-layer {
	position: fixed;
	inset: 0;
	z-index: 30;
	overflow: hidden;
	background: transparent;
	pointer-events: auto;
}

.fridge-animation-video {
	/* 变量来自 src/config/ingredients-kitchen.ts，坐标系是主体画布。 */
	position: absolute;
	top: var(--fridge-video-anchor-y);
	left: var(--fridge-video-anchor-x);
	z-index: 2;
	width: var(--fridge-video-width);
	height: auto;
	aspect-ratio: var(--fridge-video-aspect-ratio);
	opacity: 0;
	transform: scale(var(--fridge-video-scale));
	transform-origin: center center;
	object-fit: cover;
	object-position: center;
	pointer-events: none;
}

.kitchen-scene.is-fridge-debug-preview:not(.is-video-active):not(.is-fridge-opened) .fridge-animation-video {
	opacity: var(--fridge-video-debug-opacity);
}

.kitchen-scene.is-video-active .fridge-animation-video {
	animation: fridge-video-reveal var(--fridge-video-reveal-duration) 0ms forwards;
}

.kitchen-scene.is-fridge-opened .fridge-animation-video {
	opacity: var(--fridge-video-opened-opacity);
	/* filter: blur(5rpx); */
	transition: opacity var(--fridge-video-transition), filter var(--kitchen-background-transition);
}

.kitchen-scene.is-fridge-closing .fridge-animation-video {
	opacity: var(--fridge-video-opened-opacity);
}

.fridge-animation-layer.is-opening .fridge-animation-close {
	opacity: 0;
	pointer-events: none;
}

.fridge-animation-layer.is-opened .fridge-animation-close {
	opacity: 1;
	transition: opacity 220ms ease;
}

.fridge-animation-layer.is-closing .fridge-animation-close {
	opacity: 0;
	pointer-events: none;
}

.fridge-animation-close {
	position: absolute;
	top: calc(96rpx + env(safe-area-inset-top));
	right: 24rpx;
	z-index: 3;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 66rpx;
	height: 66rpx;
	border: 1rpx solid rgba(255, 255, 255, .5);
	border-radius: 50%;
	background: rgba(37, 28, 22, .34);
	color: #fff;
}

.fridge-food-sheet {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 4;
	max-height: 66vh;
	padding: 16rpx 28rpx calc(96rpx + env(safe-area-inset-bottom));
	overflow: hidden;
	border-radius: 34rpx 34rpx 0 0;
	background: rgba(255, 252, 246, .985);
	box-shadow: 0 -14rpx 44rpx rgba(35, 23, 14, .22);
	animation: fridge-sheet-rise 520ms cubic-bezier(.2, .8, .2, 1) both;
}

.fridge-sheet-handle {
	width: 72rpx;
	height: 7rpx;
	margin: 0 auto 22rpx;
	border-radius: 999rpx;
	background: #d8c9b9;
}

.fridge-sheet-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.fridge-sheet-kicker {
	display: block;
	color: #b07836;
	font-size: 17rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
}

.fridge-sheet-title {
	display: block;
	margin-top: 8rpx;
	color: #33261e;
	font-family: Georgia, 'Songti SC', serif;
	font-size: 34rpx;
	font-weight: 750;
}

.fridge-sheet-caption {
	display: block;
	margin-top: 6rpx;
	color: #8c7b6c;
	font-size: 20rpx;
}

.fridge-sheet-count {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 62rpx;
	height: 62rpx;
	border-radius: 50%;
	background: #f5e4cb;
	color: #9b6427;
	font-size: 30rpx;
	font-weight: 750;
}

.fridge-food-list {
	height: 25vh;
	max-height: 25vh;
	margin-top: 20rpx;
	overflow-y: auto;
}

.fridge-food-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
	min-height: 78rpx;
	border-bottom: 1rpx solid #eee3d8;
}

.fridge-food-status {
	width: 12rpx;
	height: 12rpx;
	flex: 0 0 auto;
	border-radius: 50%;
	background: #a9c68b;
}

.fridge-food-status.expiring {
	background: #e7ad56;
}

.fridge-food-status.expired {
	background: #c96d61;
}

.fridge-food-status.normal {
	background: #bdad8b;
}

.fridge-food-main {
	flex: 1;
	min-width: 0;
}

.fridge-food-name {
	display: block;
	overflow: hidden;
	color: #3d3028;
	font-size: 25rpx;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.fridge-food-meta {
	display: block;
	margin-top: 5rpx;
	color: #99897a;
	font-size: 19rpx;
}

.fridge-food-row>.app-icon {
	color: #b4a395;
}

.fridge-food-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	min-height: 150rpx;
	color: #aa9a8b;
	font-size: 21rpx;
}

.fridge-list-button {
	width: 100%;
	height: 76rpx;
	margin-top: 20rpx;
	border: 0;
	border-radius: 18rpx;
	background: #3f5a47;
	color: #fff;
	font-size: 23rpx;
	line-height: 76rpx;
}

@keyframes fridge-video-reveal {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}

@keyframes fridge-sheet-rise {
	from {
		opacity: 0;
		transform: translateY(100%);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media screen and (max-width: 600px) {
	.zone-panel {
		right: 4%;
		left: 4%;
		padding: 10rpx;
	}

	.zone-code {
		display: none;
	}

	.zone-name {
		font-size: 19rpx;
	}

	.zone-count {
		margin-top: 5rpx;
	}

	.zone-count text:first-child {
		font-size: 25rpx;
	}

	.zone-status {
		gap: 4rpx 7rpx;
		margin-top: 7rpx;
	}

	.status-item {
		gap: 3rpx;
		font-size: 13rpx;
	}

	.status-item text:last-child {
		font-size: 16rpx;
	}
}
</style>
