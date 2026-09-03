<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import CalendarGrid from '@/components/CalendarGrid.vue'
import type { CalendarDay } from '@/components/CalendarGrid.vue'
import { addRecipeToBasket, getBasketRecipes, loadBasket, removeRecipeFromBasketByRecipeId } from '@/services/basket'
import { formatDate, getDailyMenu, getMenuMap, loadMenu, removeMenuItem } from '@/services/menu'
import { getOrdersForDate, loadOrders } from '@/services/order'
import { fetchRecipeDetails } from '@/services/recipe'
import { formatIngredientAmount } from '@/services/ingredient-matching'
import { hasUsableIngredient, loadInventoryBatches } from '@/services/inventory'
import { switchAppTab } from '@/services/tabbar'
import { withLoginRequired } from '@/services/auth-guard'
import type { Ingredient, MealType, MenuItem, Order, Recipe } from '@/types'

const props = defineProps<{ active: boolean }>()

const selectedDate = ref(formatDate())
const menu = ref<MenuItem[]>([])
const orders = ref<Order[]>([])
const mealOptions: Array<{ value: MealType; label: string; time: string; note: string }> = [
  { value: 'breakfast', label: '早餐', time: '07:00 — 09:00', note: '轻盈开启今天' },
  { value: 'lunch', label: '午餐', time: '11:30 — 13:30', note: '留一点时间给自己' },
  { value: 'dinner', label: '晚餐', time: '17:30 — 20:00', note: '把一天好好收尾' }
]

const menuByMeal = computed(() => Object.fromEntries(mealOptions.map((meal) => [meal.value, menu.value.filter((item) => item.meal === meal.value)])) as Record<MealType, MenuItem[]>)
const isToday = computed(() => selectedDate.value === formatDate())
const isPastDate = computed(() => selectedDate.value < formatDate())

const menuMap = ref<Record<string, MenuItem[]>>({})
const recipeIngredients = ref<Record<string, Ingredient[]>>({})
const loaded = ref(false)
const basketPickerOpen = ref(false)
const basketRecipe = ref<Recipe>()
const selectedBasketIngredientIds = ref<string[]>([])
const basketSubmitting = ref(false)
const load = async () => {
  await Promise.all([loadMenu(), loadOrders(), loadBasket(), loadInventoryBatches()])
  menu.value = getDailyMenu(selectedDate.value)
  orders.value = getOrdersForDate(selectedDate.value)
  menuMap.value = getMenuMap()
  const recipes = await Promise.all(menu.value.map((item) => fetchRecipeDetails(item.recipeId).catch(() => undefined)))
  recipeIngredients.value = Object.fromEntries(menu.value.map((item, index) => [item.recipeId, recipes[index]?.ingredients || []]))
  loaded.value = true
}
const changeDate = (date: string) => { selectedDate.value = date; void load() }
watch(() => props.active, (active) => { if (active && !loaded.value) void load() }, { immediate: true })
/** 日历插槽：某天三餐完成情况（0=未安排 1=已安排） */
const mealStatusOf = (day: CalendarDay): boolean[] => mealOptions.map((meal) => (menuMap.value[day.value] || []).some((item) => item.meal === meal.value))
const remove = async (item: MenuItem) => { if (isPastDate.value) return; try { await Promise.all([removeMenuItem(item.id), removeRecipeFromBasketByRecipeId(item.recipeId, item.date)]); await load(); uni.showToast({ title: '已从计划和菜篮子移除', icon: 'none' }) } catch { uni.showToast({ title: '移除失败，请检查服务连接', icon: 'none' }) } }
const openBasketPicker = withLoginRequired(async (item: MenuItem) => {
  try {
    basketRecipe.value = await fetchRecipeDetails(item.recipeId)
    selectedBasketIngredientIds.value = []
    basketPickerOpen.value = true
  } catch { uni.showToast({ title: '食材加载失败，请检查服务连接', icon: 'none' }) }
})
const closeBasketPicker = () => { if (!basketSubmitting.value) basketPickerOpen.value = false }
const isBasketSelected = (id: string) => selectedBasketIngredientIds.value.includes(id)
const isAlreadyInBasket = (id: string) => Boolean(basketRecipe.value && getBasketRecipes().some((item) => item.recipeId === basketRecipe.value?.id && item.ingredientId === id))
const toggleBasketIngredient = (ingredient: Ingredient) => {
  if (isAlreadyInBasket(ingredient.id)) return
  const ids = selectedBasketIngredientIds.value
  selectedBasketIngredientIds.value = ids.includes(ingredient.id) ? ids.filter((id) => id !== ingredient.id) : [...ids, ingredient.id]
}
const confirmBasketSelection = async () => {
  if (!basketRecipe.value || !selectedBasketIngredientIds.value.length) return uni.showToast({ title: '请至少勾选一项食材', icon: 'none' })
  basketSubmitting.value = true
  try {
    await addRecipeToBasket(basketRecipe.value.id, selectedDate.value, selectedBasketIngredientIds.value)
    basketPickerOpen.value = false
    await load()
    uni.showToast({ title: '已加入菜篮子', icon: 'success' })
  } catch { uni.showToast({ title: '加入失败，请检查服务连接', icon: 'none' }) } finally { basketSubmitting.value = false }
}
const basketIngredientIds = (recipeId: string) => new Set(getBasketRecipes().filter((item) => item.recipeId === recipeId).map((item) => item.ingredientId))
const ingredientNotice = (item: MenuItem) => {
  const pendingIds = basketIngredientIds(item.recipeId)
  const missing: string[] = []
  const pending: string[] = []
    ; (recipeIngredients.value[item.recipeId] || []).forEach((ingredient) => {
      if (hasUsableIngredient(ingredient)) return
      if (pendingIds.has(ingredient.id)) pending.push(ingredient.name)
      else missing.push(ingredient.name)
    })
  return { missing, pending }
}
const startCooking = (item: MenuItem) => uni.navigateTo({ url: `/pages-sub/cook/index?id=${item.recipeId}` })
const openRecipes = withLoginRequired(() => switchAppTab(3))
defineExpose({ refresh: load })
</script>

<template>
  <view class="menu-page">
    <view class="menu-shell">
      <view class="intro-block">
        <view class="intro-title">
          <text>今天，吃点</text>
          <text class="intro-title-accent">值得期待的。</text>
        </view>
        <text class="intro-desc">一日三餐，是我们给生活最温柔的注脚。</text>
      </view>

      <view class="date-card">
        <CalendarGrid collapsible allow-past :initial-date="selectedDate" @select="changeDate"><template
            #default="{ day, selected, disabled }">
            <view class="meal-dots" :class="{ 'meal-dots--dim': !day.inMonth }">
              <view v-for="(done, index) in mealStatusOf(day)" :key="index" class="meal-dot"
                :class="{ 'is-done': done && !disabled, 'is-selected': selected }" />
            </view>
          </template>
        </CalendarGrid>
      </view>

      <view class="section-head">
        <view><text class="section-eyebrow">THE DAY IN THREE</text><text class="section-title">三餐时刻</text></view><text
          class="section-meta">{{ isToday ? '今日' : '计划' }}</text>
      </view>
      <view class="meal-list">
        <view v-for="(meal, index) in mealOptions" :key="meal.value" class="meal-block"
          :class="[`meal-${meal.value}`, { filled: menuByMeal[meal.value].length }]">
          <view class="meal-bar">
            <view class="meal-index">0{{ index + 1 }}</view>
            <view class="meal-bar-main"><text class="meal-name">{{ meal.label }}</text><text class="meal-summary">{{
              menuByMeal[meal.value].length ? menuByMeal[meal.value].map((item) => item.recipeTitle).join('、') :
                '这一餐还留着'
                }}</text></view>
            <text class="meal-status">{{ menuByMeal[meal.value].length ? `${menuByMeal[meal.value].length} 道` : '空白'
              }}</text>
          </view>
          <view class="meal-detail">
            <view v-for="item in menuByMeal[meal.value]" :key="item.id" class="dish-card">
              <image :src="item.cover" mode="aspectFill" />
              <view class="dish-copy">
                <view class="dish-title-row"><text class="dish-title">{{ item.recipeTitle }}</text><text
                    v-if="!isPastDate" class="remove" @click="remove(item)">移除</text></view><text class="dish-source">{{
                      item.source }}<text v-if="item.orderedBy"> · {{ item.orderedBy }}点餐</text></text><text
                  v-if="ingredientNotice(item).missing.length" class="dish-missing">未记录：{{
                    ingredientNotice(item).missing.join('、') }}</text><text v-if="ingredientNotice(item).pending.length"
                  class="dish-pending">待采购：{{ ingredientNotice(item).pending.join('、') }}</text><text
                  v-if="!ingredientNotice(item).missing.length && !ingredientNotice(item).pending.length"
                  class="dish-ready">食材库已记录所需食材</text>
                <view v-if="!isPastDate" class="dish-actions"><button class="basket-button"
                    @click="openBasketPicker(item)">加入菜篮子</button><button class="cook-button"
                    @click="startCooking(item)">开始烹饪
                    <AppIcon name="arrow-up-right" size="sm" />
                  </button></view>
              </view>
            </view>
            <view v-if="!menuByMeal[meal.value].length" class="meal-empty">
              <view class="empty-symbol">
                <AppIcon name="plus" size="md" />
              </view>
              <view><text class="empty-title">这一餐还留着</text><text class="empty-desc">从食谱里挑一道，放进今天的故事</text></view>
              <view class="empty-arrow" @click="openRecipes">
                <AppIcon name="plus" size="md" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="editor-note">
        <view class="note-rule" />
        <view><text class="note-kicker">A LITTLE NOTE</text><text class="note-copy">慢一点吃饭，认真感受每一种味道。</text></view>
        <AppIcon name="spark" size="md" />
      </view>
      <view v-if="orders.length" class="orders">
        <view class="section-head">
          <view><text class="section-eyebrow">FROM YOUR TABLE</text><text class="section-title">点餐请求</text></view><text
            class="section-meta">{{ orders.length }} 位餐客</text>
        </view>
        <view v-for="order in orders" :key="order.id" class="order-row">
          <view><text class="order-name">{{ order.guestName }} 点了 {{ order.recipeTitle }}</text><text
              class="order-note">“{{
                order.note || '按食谱默认口味' }}”</text></view><text class="order-status">{{ order.status === 'accepted' ?
                '已加入计划' :
                '待确认' }}</text>
        </view>
      </view>
    </view>
  </view>
  <up-popup :show="basketPickerOpen" custom-class="popup-static" mode="bottom" :safe-area-inset-bottom="true"
    @close="closeBasketPicker">
    <view class="basket-picker">
      <view class="basket-picker-head">
        <view><text class="basket-picker-kicker">ADD TO BASKET</text><text
            class="basket-picker-title">选择要采购的食材</text><text class="basket-picker-desc">食材库已有的也会列出，由你决定是否再次购买</text>
        </view>
        <view class="picker-close" @click="closeBasketPicker">
          <AppIcon name="close" size="md" />
        </view>
      </view>
      <view class="basket-ingredients">
        <view v-for="ingredient in basketRecipe?.ingredients || []" :key="ingredient.id" class="basket-ingredient"
          :class="{ disabled: isAlreadyInBasket(ingredient.id) }" @click="toggleBasketIngredient(ingredient)">
          <view class="check-box"
            :class="{ checked: isBasketSelected(ingredient.id) || isAlreadyInBasket(ingredient.id) }">
            <AppIcon v-if="isBasketSelected(ingredient.id) || isAlreadyInBasket(ingredient.id)" name="check"
              size="sm" />
          </view>
          <view class="basket-ingredient-copy">
            <view class="basket-ingredient-title"><text>{{ ingredient.name }}</text><text
                v-if="hasUsableIngredient(ingredient)" class="inventory-tag">食材库已有</text><text
                v-else-if="isAlreadyInBasket(ingredient.id)" class="pending-tag">待采购</text><text v-else
                class="missing-tag">未记录</text></view><text class="basket-ingredient-amount">食谱用量：{{
                  formatIngredientAmount(ingredient.amount) }}</text>
          </view>
          <text v-if="isAlreadyInBasket(ingredient.id)" class="basket-added">已在菜篮子</text>
        </view>
      </view>
      <button class="basket-confirm" :loading="basketSubmitting" @click="confirmBasketSelection">加入已勾选食材</button>
    </view>
  </up-popup>
</template>

<style scoped>
.menu-page {
  background: #fdf8f2;
  color: #33261e;
  padding-top: var(--safe-top);
}

.menu-shell {
  width: 100%;
  max-width: 860rpx;
  margin: 0 auto;
  padding-left: 34rpx;
  padding-right: 34rpx;
  padding-bottom: calc(112rpx + 14rpx + env(safe-area-inset-bottom));
}

.section-head,
.dish-title-row,
.dish-actions,
.meal-empty,
.editor-note,
.order-row {
  display: flex;
  align-items: center;
}

.section-head,
.dish-title-row,
.meal-empty,
.editor-note,
.order-row {
  justify-content: space-between;
}

.intro-block {
  padding: 12rpx 4rpx 42rpx;
}

.intro-title {
  display: flex;
  flex-direction: column;
  color: #33261e;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 65rpx;
  font-weight: 700;
  line-height: 1.25;
  line-height: 1.16;
  letter-spacing: -2rpx;
}

.intro-title-accent {
  color: #e8542e;
}

.intro-desc {
  display: block;
  margin-top: 20rpx;
  color: #8a7a70;
  font-size: 23rpx;
  letter-spacing: 1rpx;
}

.date-card {
  padding: 24rpx 22rpx 12rpx;
  border: 1rpx solid #f0e3d6;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 18rpx 34rpx rgba(214, 96, 44, .06);
}

.date-card :deep(.cal) {
  margin-top: 4rpx;
}

/* 三餐完成度小圆点 */
.meal-dots {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.meal-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #eadfd4;
}

.meal-dot.is-done {
  background: #e8542e;
}

.meal-dot.is-selected {
  background: rgba(255, 255, 255, .92);
}

.meal-dot.is-selected.is-done {
  background: #ffd9a8;
}

.meal-dots--dim .meal-dot {
  opacity: .35;
}

.section-head {
  margin: 32rpx 4rpx 20rpx;
  align-items: flex-end;
}

.section-eyebrow {
  display: block;
  color: #b8862f;
  font-size: 15rpx;
}

.section-title {
  display: block;
  margin-top: 7rpx;
  color: #33261e;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 37rpx;
  font-weight: 700;
}

.section-meta {
  padding-bottom: 5rpx;
  color: #c93d20;
  font-size: 20rpx;
}

.meal-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.meal-block {
  overflow: hidden;
  border: 1rpx solid #f0e3d6;
  border-radius: 22rpx;
  background: #fff;
  box-shadow: 0 8rpx 20rpx rgba(214, 96, 44, .05);
}

.meal-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 92rpx;
  padding: 14rpx 20rpx;
}

.meal-index {
  flex: 0 0 44rpx;
  color: #e9a13b;
  font-family: Georgia, serif;
  font-size: 19rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.meal-bar-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.meal-name {
  color: #33261e;
  font-size: 28rpx;
  font-weight: 700;
}

.meal-summary {
  overflow: hidden;
  color: #a29388;
  font-size: 19rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-status {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #f7efe6;
  color: #a29388;
  font-size: 17rpx;
}

.filled .meal-status {
  background: #fdeee7;
  color: #c93d20;
  font-weight: 500;
}

.meal-detail {
  padding: 0 16rpx 16rpx;
}

.dish-card {
  display: flex;
  gap: 16rpx;
  padding: 12rpx;
  border: 1rpx solid #f0e3d6;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 10rpx 24rpx rgba(214, 96, 44, .06);
}

.dish-card image {
  flex: 0 0 158rpx;
  width: 158rpx;
  height: 154rpx;
  border-radius: 14rpx;
  background: #f7ede3;
}

.dish-copy {
  flex: 1;
  min-width: 0;
  padding: 3rpx 3rpx 2rpx 0;
}

.dish-title {
  overflow: hidden;
  color: #33261e;
  font-size: 27rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove {
  flex-shrink: 0;
  color: #8a6f5f;
  font-size: 17rpx;
}

.dish-source {
  display: block;
  margin-top: 8rpx;
  color: #a29388;
  font-size: 18rpx;
}

.dish-missing,
.dish-ready {
  display: block;
  margin-top: 10rpx;
  font-size: 18rpx;
}

.dish-missing {
  color: #c67550;
}

.dish-pending {
  display: block;
  margin-top: 10rpx;
  color: #b8862f;
  font-size: 18rpx;
}

.dish-ready {
  color: #7ba05b;
}

.dish-actions {
  gap: 9rpx;
  margin-top: 22rpx;
}

.dish-actions button {
  flex: 1;
  height: 48rpx;
  padding: 0 7rpx;
  border-radius: 12rpx;
  font-size: 17rpx;
  line-height: 48rpx;
}

.basket-button {
  border: 1.5rpx solid #f0e3d6;
  background: #fdf8f2;
  color: #c93d20;
  font-weight: 500;
}

.cook-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%);
  color: #fff;
  font-weight: 500;
  box-shadow: 0 8rpx 16rpx rgba(232, 84, 46, .24);
}

.meal-empty {
  min-height: 104rpx;
  padding: 17rpx 18rpx;
  border: 1.5rpx dashed #f0d9c9;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, .7);
}

.empty-symbol {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: #fdeee7;
  color: #c93d20;
}

.meal-empty>view:nth-child(2) {
  flex: 1;
  margin-left: 14rpx;
}

.empty-title,
.empty-desc {
  display: block;
}

.empty-title {
  color: #6f5f54;
  font-size: 21rpx;
  font-weight: 600;
}

.empty-desc {
  margin-top: 5rpx;
  color: #a29388;
  font-size: 17rpx;
}

.empty-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%);
  color: #fff;
  box-shadow: 0 8rpx 18rpx rgba(232, 84, 46, .26);
}

.editor-note {
  gap: 17rpx;
  margin: 47rpx 4rpx 10rpx;
  padding: 22rpx 0;
}

.note-rule {
  width: 44rpx;
  height: 2rpx;
  background: #e9a13b;
}

.note-kicker,
.note-copy {
  display: block;
}

.note-kicker {
  color: #b8862f;
  font-size: 14rpx;
}

.note-copy {
  margin-top: 7rpx;
  color: #6f5f54;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 23rpx;
}

.editor-note>.app-icon {
  margin-left: auto;
  color: #e9a13b;
}

.orders {
  padding-top: 12rpx;
}

.orders .section-head {
  margin-top: 26rpx;
}

.order-row {
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0e3d6;
}

.order-name {
  display: block;
  color: #6f5f54;
  font-size: 21rpx;
  font-weight: 500;
}

.order-note {
  display: block;
  margin-top: 6rpx;
  color: #a29388;
  font-size: 18rpx;
}

.order-status {
  flex-shrink: 0;
  color: #c93d20;
  font-size: 18rpx;
  font-weight: 500;
}

.basket-picker {
  width: 100%;
  max-height: 82vh;
  padding: 30rpx 30rpx calc(30rpx + env(safe-area-inset-bottom));
  border-radius: 42rpx 42rpx 0 0;
  background: #fdf8f2;
}

.basket-picker-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.basket-picker-kicker {
  display: block;
  color: #b8862f;
  font-size: 17rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.basket-picker-title {
  display: block;
  margin-top: 8rpx;
  color: #33261e;
  font-size: 34rpx;
  font-weight: 750;
}

.basket-picker-desc {
  display: block;
  max-width: 560rpx;
  margin-top: 8rpx;
  color: #a29388;
  font-size: 20rpx;
  line-height: 1.45;
}

.picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  color: #a29388;
}

.basket-ingredients {
  max-height: 52vh;
  margin-top: 22rpx;
  overflow-y: auto;
}

.basket-ingredient {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 82rpx;
  padding: 14rpx 2rpx;
  border-bottom: 1rpx solid #f0e3d6;
}

.basket-ingredient.disabled {
  opacity: .58;
}

.check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38rpx;
  width: 38rpx;
  height: 38rpx;
  border: 2rpx solid #d9c9bc;
  border-radius: 10rpx;
  background: #fff;
  color: #fff;
}

.check-box.checked {
  border-color: #e8542e;
  background: #e8542e;
}

.basket-ingredient-copy {
  flex: 1;
  min-width: 0;
}

.basket-ingredient-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: #33261e;
  font-size: 25rpx;
  font-weight: 650;
}

.inventory-tag,
.missing-tag {
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  font-size: 17rpx;
  font-weight: 500;
}

.inventory-tag {
  background: #eef4e8;
  color: #64894a;
}

.missing-tag {
  background: #fff1e6;
  color: #c67550;
}

.pending-tag {
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  background: #fdf3e0;
  color: #b8862f;
  font-size: 17rpx;
  font-weight: 500;
}

.basket-ingredient-amount {
  display: block;
  margin-top: 5rpx;
  color: #a29388;
  font-size: 19rpx;
}

.basket-added {
  flex-shrink: 0;
  color: #a29388;
  font-size: 18rpx;
}

.basket-confirm {
  width: 100%;
  height: 82rpx;
  margin-top: 24rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #ff8a3d 0%, #e8542e 100%);
  color: #fff;
  font-size: 26rpx;
  line-height: 82rpx;
}
</style>
