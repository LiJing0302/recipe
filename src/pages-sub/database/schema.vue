<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '@/components/PageHeader.vue'
import { getDatabaseSchemaRemote } from '@/services/api'
import type { DatabaseSchema, DatabaseTable } from '@/types'

const emptyTable: DatabaseTable = { name: '', type: '', columns: [], relations: [] }
const schema = ref<DatabaseSchema>({ database: '', schema: '', updatedAt: '', tables: [] })
const selectedName = ref('Recipe')
const loading = ref(false)
const error = ref('')
const tables = computed(() => schema.value.tables)
const selectedTable = computed<DatabaseTable>(() => tables.value.find((table) => table.name === selectedName.value) || tables.value[0] || emptyTable)
const businessTables = computed(() => tables.value.filter((table) => table.name !== '_prisma_migrations'))
const allColumns = computed(() => tables.value.reduce((total, table) => total + table.columns.length, 0))
const allRelations = computed(() => tables.value.reduce((total, table) => total + table.relations.length, 0))
const isSystemTable = (table: DatabaseTable) => table.name.startsWith('_')
const typeLabel = (column: DatabaseTable['columns'][number]) => column.udtName === 'jsonb' ? 'JSONB' : column.udtName === '_text' ? 'TEXT[]' : column.dataType.toUpperCase()
const defaultLabel = (value: string | null) => value ? value.replace(/::[a-z_\[\]]+/g, '') : '无'
const isPrimaryKey = (table: DatabaseTable, columnName: string) => columnName === 'id'
const relationFor = (table: DatabaseTable, columnName: string) => table.relations.find((relation) => relation.columnName === columnName)
const descriptionFor = (column: DatabaseTable['columns'][number]) => column.description || `${column.tableName}.${column.name} 数据库字段`

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const remote = await getDatabaseSchemaRemote()
    schema.value = remote
    if (!remote.tables.some((table) => table.name === selectedName.value)) selectedName.value = remote.tables[0]?.name || 'Recipe'
  } catch (reason) {
    console.error('[database-schema] load failed', reason)
    schema.value = { database: '', schema: '', updatedAt: '', tables: [] }
    error.value = '数据库结构加载失败，请检查服务连接'
  } finally {
    loading.value = false
  }
}

const selectTable = (name: string) => { selectedName.value = name }
onShow(load)
</script>

<template>
  <view class="schema-screen">
    <PageHeader title="数据库结构" />
    <view class="schema-page page-shell">
    <view class="page-header">
      <button class="refresh-button" :disabled="loading" @click="load">{{ loading ? '同步中...' : '刷新结构' }}</button>
    </view>

    <view class="connection-bar surface"><view class="connection-status"><text class="status-dot" /><text>只读结构视图</text></view><text class="connection-meta">{{ schema.database }} · {{ schema.schema }}{{ schema.updatedAt ? ` · ${schema.updatedAt.slice(0, 16).replace('T', ' ')}` : '' }}</text></view>
    <view v-if="error" class="notice">{{ error }}</view>

    <view class="stats-grid">
      <view class="stat-card surface"><text class="stat-label">业务表</text><text class="stat-value">{{ businessTables.length }}</text><text class="stat-note">可维护数据表</text></view>
      <view class="stat-card surface"><text class="stat-label">全部字段</text><text class="stat-value">{{ allColumns }}</text><text class="stat-note">含系统迁移表</text></view>
      <view class="stat-card surface"><text class="stat-label">外键关系</text><text class="stat-value">{{ allRelations }}</text><text class="stat-note">表之间的连接</text></view>
      <view class="stat-card surface"><text class="stat-label">JSON 字段</text><text class="stat-value">{{ tables.reduce((total, table) => total + table.columns.filter((column) => column.udtName === 'jsonb').length, 0) }}</text><text class="stat-note">菜谱内嵌明细</text></view>
    </view>

    <view class="schema-layout">
      <view class="table-sidebar surface"><view class="sidebar-heading"><text>数据表</text><text>{{ tables.length }}</text></view><view v-for="table in tables" :key="table.name" class="table-item" :class="{ active: selectedTable.name === table.name }" @click="selectTable(table.name)"><view class="table-icon">{{ isSystemTable(table) ? 'SYS' : 'TB' }}</view><view class="table-copy"><text class="table-name">{{ table.name }}</text><text class="table-meta">{{ table.columns.length }} 个字段 · {{ isSystemTable(table) ? '系统表' : '业务表' }}</text></view><text class="table-chevron">›</text></view></view>
      <view class="detail-panel surface"><view class="detail-header"><view><text class="detail-kicker">TABLE DEFINITION</text><text class="detail-title">{{ selectedTable.name }}</text></view><text class="table-kind">{{ isSystemTable(selectedTable) ? '系统表' : '业务表' }}</text></view><text class="detail-description">{{ selectedTable.name === 'Recipe' ? '菜谱主体信息，食材和制作步骤以 JSONB 数组保存在本表中。' : selectedTable.name === 'User' ? '用户档案及个人烹饪统计。' : 'Prisma 数据库迁移历史记录。' }}</text>
        <view class="column-head"><text>字段</text><text>类型</text><text>字段说明</text><text>可空</text><text>默认值</text><text>约束</text></view>
        <view v-for="column in selectedTable.columns" :key="column.name" class="column-row"><view class="column-name"><text>{{ column.name }}</text><text v-if="column.udtName === 'jsonb'" class="json-mark">JSON</text></view><text class="column-type">{{ typeLabel(column) }}</text><text class="column-description">{{ descriptionFor(column) }}</text><text class="column-nullable" :class="{ required: column.nullable === 'NO' }">{{ column.nullable === 'NO' ? '否' : '是' }}</text><text class="column-default">{{ defaultLabel(column.defaultValue) }}</text><view class="constraint-list"><text v-if="isPrimaryKey(selectedTable, column.name)" class="constraint pk">PK</text><text v-if="relationFor(selectedTable, column.name)" class="constraint fk">FK</text><text v-if="relationFor(selectedTable, column.name)" class="relation-hint">→ {{ relationFor(selectedTable, column.name)?.foreignTableName }}.{{ relationFor(selectedTable, column.name)?.foreignColumnName }}</text></view></view>
        <view v-if="!selectedTable.columns.length" class="empty-state">暂无字段信息</view>
      </view>
    </view>

    <view class="relations-section surface"><view class="section-heading"><view><text class="detail-kicker">RELATION MAP</text><text class="section-title">关联关系</text></view><text class="caption">只读 · 便于后续接入 DataEase</text></view><view v-if="allRelations" class="relation-map"><view v-for="table in tables" :key="table.name"><view v-for="relation in table.relations" :key="`${relation.tableName}-${relation.columnName}`" class="relation-line"><view class="relation-node"><text class="node-label">{{ relation.foreignTableName }}</text><text>{{ relation.foreignColumnName }}</text></view><view class="line-center"><text>1</text><view class="line" /><text>N</text></view><view class="relation-node target"><text class="node-label">{{ relation.tableName }}</text><text>{{ relation.columnName }}</text></view></view></view><view v-if="!allRelations" class="empty-state">当前没有外键关系</view></view></view>
    </view>
  </view>
</template>

<style scoped>
.schema-screen { min-height: 100vh; background: #fdf8f2; }
.schema-page { min-height: 0; padding-top: 16rpx; padding-bottom: 70rpx; }
.page-header { display: flex; align-items: flex-end; justify-content: flex-end; gap: 24rpx; }
.eyebrow, .detail-kicker { display: block; color: #8b948b; font-size: 20rpx; letter-spacing: 2rpx; }
.page-title { display: block; margin-top: 14rpx; color: #33261e; font-size: 48rpx; font-weight: 700; }
.page-desc { display: block; margin-top: 10rpx; color: #a29388; font-size: 24rpx; }
.refresh-button { flex-shrink: 0; margin: 0; padding: 0 24rpx; border-radius: 14rpx; background: #c93d20; color: #fff; font-size: 23rpx; line-height: 72rpx; height: 72rpx; }
.refresh-button[disabled] { opacity: .55; }
.connection-bar { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-top: 28rpx; padding: 20rpx 24rpx; border: 1rpx solid #f0e3d6; }
.connection-status { display: flex; align-items: center; gap: 10rpx; color: #355e50; font-size: 23rpx; font-weight: 600; }
.status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #64a37f; }
.connection-meta { color: #a29388; font-size: 21rpx; }
.notice { margin-top: 16rpx; padding: 16rpx 20rpx; border-radius: 12rpx; background: #fff7e8; color: #9a6a27; font-size: 22rpx; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin-top: 20rpx; }
.stat-card { min-height: 142rpx; padding: 20rpx; border: 1rpx solid #f5e9dd; }
.stat-label, .stat-note { display: block; color: #a29388; font-size: 21rpx; }
.stat-value { display: block; margin-top: 8rpx; color: #c93d20; font-size: 40rpx; font-weight: 700; }
.stat-note { margin-top: 5rpx; font-size: 19rpx; }
.schema-layout { display: grid; grid-template-columns: 300rpx minmax(0, 1fr); gap: 18rpx; margin-top: 20rpx; align-items: start; }
.table-sidebar { overflow: hidden; padding: 10rpx 0; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; color: #33261e; font-size: 25rpx; font-weight: 700; }
.sidebar-heading text:last-child { color: #a29388; font-size: 21rpx; font-weight: 400; }
.table-item { display: flex; align-items: center; gap: 12rpx; min-height: 86rpx; padding: 14rpx 18rpx; border-top: 1rpx solid #f0f2ed; }
.table-item.active { background: #eef4ed; }
.table-icon { display: flex; align-items: center; justify-content: center; width: 52rpx; height: 52rpx; border-radius: 10rpx; background: #e2eee4; color: #c93d20; font-size: 16rpx; font-weight: 700; }
.table-item.active .table-icon { background: #c93d20; color: #fff; }
.table-copy { min-width: 0; flex: 1; }
.table-name { display: block; overflow: hidden; color: #34473f; font-size: 24rpx; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.table-meta { display: block; margin-top: 5rpx; color: #a29388; font-size: 19rpx; }
.table-chevron { color: #a0aaa1; font-size: 34rpx; line-height: 1; }
.detail-panel { min-width: 0; overflow: hidden; padding: 26rpx; }
.detail-header, .section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20rpx; }
.detail-title { display: block; margin-top: 10rpx; color: #33261e; font-size: 38rpx; font-weight: 700; }
.table-kind { padding: 8rpx 12rpx; border-radius: 8rpx; background: #fdeee7; color: #587166; font-size: 19rpx; }
.detail-description { display: block; margin-top: 12rpx; color: #a29388; font-size: 22rpx; line-height: 1.5; }
.column-head, .column-row { display: grid; grid-template-columns: minmax(150rpx, 1.25fr) minmax(110rpx, .85fr) minmax(220rpx, 2fr) 70rpx minmax(100rpx, .95fr) minmax(120rpx, 1.3fr); gap: 12rpx; align-items: center; }
.column-head { margin-top: 24rpx; padding: 14rpx 12rpx; background: #f4f6f1; color: #a29388; font-size: 19rpx; }
.column-row { min-height: 68rpx; padding: 12rpx; border-bottom: 1rpx solid #f5e9dd; color: #34473f; font-size: 21rpx; }
.column-name { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.column-name > text:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.column-type, .column-description, .column-nullable, .column-default { overflow: hidden; color: #65756b; text-overflow: ellipsis; white-space: nowrap; }
.column-description { color: #a29388; }
.column-nullable { color: #a29388; }
.column-nullable.required { color: #c93d20; }
.column-default { color: #a29388; font-size: 19rpx; }
.json-mark, .constraint { flex-shrink: 0; padding: 3rpx 6rpx; border-radius: 5rpx; font-size: 16rpx; font-weight: 700; }
.json-mark { background: #fff1da; color: #a56c1f; }
.constraint-list { display: flex; align-items: center; flex-wrap: wrap; gap: 6rpx; min-width: 0; }
.constraint.pk { background: #e5f1e9; color: #3f775a; }
.constraint.fk { background: #e9eef7; color: #50698d; }
.relation-hint { overflow: hidden; color: #a29388; font-size: 17rpx; text-overflow: ellipsis; white-space: nowrap; }
.relations-section { margin-top: 20rpx; padding: 26rpx; }
.section-title { display: block; margin-top: 9rpx; color: #33261e; font-size: 32rpx; font-weight: 700; }
.relation-map { margin-top: 22rpx; }
.relation-line { display: flex; align-items: center; gap: 20rpx; max-width: 760rpx; }
.relation-node { min-width: 190rpx; padding: 16rpx 20rpx; border: 1rpx solid #dfe9df; border-radius: 12rpx; background: #f7faf5; color: #a29388; font-size: 19rpx; }
.relation-node.target { border-color: #e8d6b7; background: #fffaf1; }
.node-label { display: block; margin-bottom: 5rpx; color: #c93d20; font-size: 23rpx; font-weight: 700; }
.line-center { display: flex; align-items: center; gap: 8rpx; color: #a29388; font-size: 18rpx; }
.line { width: 80rpx; height: 2rpx; background: #b8c9ba; }
.caption { font-size: 20rpx; }
@media (max-width: 700px) {
  .schema-page { padding-top: 28rpx; padding-right: 20rpx; padding-left: 20rpx; }
  .page-title { font-size: 42rpx; }
  .page-header { align-items: flex-start; }
  .connection-bar { align-items: flex-start; flex-direction: column; gap: 8rpx; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .schema-layout { grid-template-columns: 190rpx minmax(0, 1fr); gap: 10rpx; }
  .table-item { gap: 8rpx; padding-right: 10rpx; padding-left: 10rpx; }
  .table-icon { width: 42rpx; height: 42rpx; font-size: 14rpx; }
  .table-meta { font-size: 17rpx; }
  .table-chevron { display: none; }
  .detail-panel, .relations-section { padding: 18rpx; }
  .column-head, .column-row { grid-template-columns: minmax(125rpx, 1.2fr) minmax(78rpx, .85fr) minmax(130rpx, 1.35fr) 52rpx; }
  .column-head text:nth-child(5), .column-head text:last-child, .column-row .column-default, .column-row .constraint-list { display: none; }
  .relation-line { gap: 8rpx; }
  .relation-node { min-width: 130rpx; padding: 12rpx; }
  .line { width: 30rpx; }
}
</style>
