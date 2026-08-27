<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface CalendarDay {
  /** YYYY-MM-DD */
  value: string
  /** 日数字 */
  number: number
  /** 是否属于当前展示月份（用于上下月补位置灰） */
  inMonth: boolean
  /** 是否晚于最小可选日期 */
  selectable: boolean
}

const props = defineProps<{
  /** 默认选中日期 YYYY-MM-DD */
  initialDate: string
  /** 最小可选日期，默认今天 */
  minDate?: string
  /** 启用折叠模式：默认只显示当前周一行，底部句柄可拖拽/点击展开整月 */
  collapsible?: boolean
  /** 允许选择今天之前的日期（查看历史计划） */
  allowPast?: boolean
}>()
const emit = defineEmits<{ select: [date: string] }>()

const formatDate = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
const today = props.minDate || formatDate(new Date())
const selectedDate = ref(props.initialDate < today && !props.allowPast ? today : props.initialDate)
const visibleMonth = ref(new Date(`${selectedDate.value}T00:00:00`))

const monthLabel = computed(() => `${visibleMonth.value.getFullYear()}年${visibleMonth.value.getMonth() + 1}月`)
const calendarDays = computed<CalendarDay[]>(() => {
  const firstDay = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth(), 1)
  const start = new Date(firstDay)
  start.setDate(1 - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const value = formatDate(date)
    return { value, number: date.getDate(), inMonth: date.getMonth() === visibleMonth.value.getMonth(), selectable: props.allowPast || value >= today }
  })
})

/* ---------- 折叠模式 ---------- */
const rpxToPx = () => (uni.getSystemInfoSync().windowWidth || 375) / 750
const ROW_H = 92 // 单行：84rpx 行高 + 8rpx 行距
const rowHpx = computed(() => ROW_H * rpxToPx())
const MAX_H = computed(() => (ROW_H * 6 - 8) * rpxToPx()) // 6 行 5 间距

const collapsed = ref(true)
const wrapHeight = ref(0)
const innerOffset = ref(0)

const currentRowIndex = computed(() => {
  const idx = calendarDays.value.findIndex((d) => d.value === selectedDate.value)
  return idx < 0 ? 0 : Math.floor(idx / 7)
})

const syncCollapse = () => {
  if (!props.collapsible) {
    collapsed.value = false
    wrapHeight.value = MAX_H.value
    innerOffset.value = 0
    return
  }
  if (collapsed.value) {
    wrapHeight.value = rowHpx.value
    innerOffset.value = currentRowIndex.value * rowHpx.value
  } else {
    wrapHeight.value = MAX_H.value
    innerOffset.value = 0
  }
}

const setCollapsed = (value: boolean) => {
  collapsed.value = value
  syncCollapse()
}
const toggle = () => {
  if (!props.collapsible) return
  setCollapsed(!collapsed.value)
}

watch(() => props.initialDate, (value) => {
  const planDate = value < today && !props.allowPast ? today : value
  selectedDate.value = planDate
  visibleMonth.value = new Date(`${planDate}T00:00:00`)
  syncCollapse()
})
watch(() => props.collapsible, () => syncCollapse(), { immediate: true })

/* ---------- 常规日历行为 ---------- */
const changeMonth = (offset: number) => {
  const next = new Date(visibleMonth.value)
  next.setMonth(next.getMonth() + offset)
  if (!props.allowPast && formatDate(new Date(next.getFullYear(), next.getMonth() + 1, 0)) < today) return
  visibleMonth.value = next
}
const chooseDate = (day: CalendarDay) => {
  if (!day.selectable) return
  selectedDate.value = day.value
  const date = new Date(`${day.value}T00:00:00`)
  if (date.getMonth() !== visibleMonth.value.getMonth()) visibleMonth.value = date
  syncCollapse()
  emit('select', day.value)
}
</script>

<template>
  <view class="cal">
    <view class="cal-head">
      <text class="cal-month">{{ monthLabel }}</text>
      <view class="cal-actions">
        <text class="cal-switch" @click="changeMonth(-1)">‹</text>
        <text class="cal-switch" @click="changeMonth(1)">›</text>
      </view>
    </view>
    <view class="cal-week">
      <text v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="cal-week-day">{{ day }}</text>
    </view>
    <view class="cal-days-wrap" :style="{ height: `${wrapHeight}px` }">
      <view class="cal-days" :style="{ transform: `translateY(-${innerOffset}px)` }">
        <view
          v-for="day in calendarDays"
          :key="day.value"
          class="cal-day"
          :class="{ 'is-outside': !day.inMonth, 'is-disabled': !day.selectable, 'is-selected': day.value === selectedDate, 'is-today': day.value === today }"
          @click="chooseDate(day)"
        >
          <text class="cal-day-number">{{ day.number }}</text>
          <view class="cal-day-extra">
            <!-- 业务域扩展点：自定义每天 item 的内容 -->
            <slot :day="day" :selected="day.value === selectedDate" :disabled="!day.selectable" />
          </view>
        </view>
      </view>
    </view>
    <!-- 折叠句柄：点击展开/收起 -->
    <view v-if="collapsible" class="cal-handle" @click="toggle">
      <view class="cal-handle-bar" />
      <text class="cal-handle-tip">{{ collapsed ? '点击展开本月' : '点击收起至本周' }}</text>
    </view>
  </view>
</template>

<style scoped>
.cal { width: 100%; }
.cal-head { display: flex; align-items: center; justify-content: space-between; }
.cal-month { color: #c93d20; font-size: 29rpx; font-weight: 700; }
.cal-actions { display: flex; gap: 26rpx; color: #c93d20; font-size: 46rpx; line-height: 30rpx; }
.cal-switch { padding: 6rpx 10rpx; }
.cal-week, .cal-days { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
.cal-week { margin-top: 22rpx; color: #a29388; font-size: 21rpx; }
.cal-days-wrap { overflow: hidden; margin-top: 12rpx; transition: height .28s ease; }
.cal-days { row-gap: 8rpx; transition: transform .28s ease; }
.cal-day { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 84rpx; color: #34473f; }
.cal-day-number { display: flex; align-items: center; justify-content: center; width: 54rpx; height: 54rpx; border-radius: 50%; font-size: 24rpx; line-height: 1; }
.cal-day-extra { display: flex; align-items: center; justify-content: center; height: 22rpx; margin-top: 2rpx; }
.cal-day.is-outside { color: #c9cec8; }
.cal-day.is-outside .cal-day-number { color: #c9cec8; }
.cal-day.is-disabled .cal-day-number { color: #dfe3dd; }
.cal-day.is-selected .cal-day-number { background: #c93d20; color: #fff; font-weight: 700; box-shadow: 0 8rpx 16rpx rgba(201, 61, 32, .22); }
.cal-day.is-today:not(.is-selected) .cal-day-number { border: 2rpx solid #e8542e; color: #e8542e; font-weight: 700; }
/* 折叠句柄 */
.cal-handle { display: flex; flex-direction: column; align-items: center; padding: 16rpx 0 4rpx; }
.cal-handle-bar { width: 64rpx; height: 8rpx; border-radius: 999rpx; background: #e5d9cd; transition: background .2s ease, transform .2s ease; }
.cal-handle-tip { margin-top: 10rpx; color: #a29388; font-size: 18rpx; letter-spacing: 1rpx; }
</style>