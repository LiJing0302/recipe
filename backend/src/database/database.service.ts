import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type TableRow = { name: string; type: string }
type ColumnRow = {
  tableName: string
  name: string
  dataType: string
  udtName: string
  nullable: string
  defaultValue: string | null
  position: number
}
type RelationRow = {
  tableName: string
  columnName: string
  foreignTableName: string
  foreignColumnName: string
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  'User.id': '用户唯一标识',
  'User.name': '用户显示名称',
  'User.avatar': '用户头像地址',
  'User.bio': '个人简介',
  'User.cookingDays': '累计烹饪天数',
  'User.totalCooking': '累计烹饪次数',
  'User.favoriteCount': '收藏菜谱数量',
  'User.createdAt': '用户创建时间',
  'User.updatedAt': '用户最后更新时间',
  'Recipe.id': '菜谱唯一标识',
  'Recipe.title': '菜谱名称',
  'Recipe.subtitle': '菜谱简介或副标题',
  'Recipe.cover': '菜谱主图地址',
  'Recipe.source': '菜谱来源类型',
  'Recipe.authorId': '创建者用户 ID',
  'Recipe.tags': '菜谱标签数组',
  'Recipe.flavor': '菜品口味',
  'Recipe.process': '制作工艺，使用系统维护的工艺选项',
  'Recipe.servings': '适用人数',
  'Recipe.duration': '预计制作时长，单位为分钟',
  'Recipe.difficulty': '制作难度',
  'Recipe.rating': '菜谱平均评分',
  'Recipe.ratingCount': '参与评分的人数',
  'Recipe.cookingCount': '菜谱累计烹饪次数',
  'Recipe.skillLevel': '个人熟练度等级',
  'Recipe.isPublic': '是否公开到社区',
  'Recipe.createdAt': '菜谱创建时间',
  'Recipe.updatedAt': '菜谱最后更新时间',
  'Recipe.categories': '家庭场景食材分类数组',
  'Recipe.ingredients': '食材明细 JSONB 数组',
  'Recipe.steps': '制作步骤 JSONB 数组',
  '_prisma_migrations.id': '迁移记录唯一标识',
  '_prisma_migrations.checksum': '迁移文件校验值',
  '_prisma_migrations.finished_at': '迁移完成时间',
  '_prisma_migrations.migration_name': '迁移名称',
  '_prisma_migrations.logs': '迁移执行日志',
  '_prisma_migrations.rolled_back_at': '迁移回滚时间',
  '_prisma_migrations.started_at': '迁移开始时间',
  '_prisma_migrations.applied_steps_count': '已执行迁移步骤数'
}

@Injectable()
export class DatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchema() {
    const [tables, columns, relations] = await Promise.all([
      this.prisma.$queryRaw<TableRow[]>`
        SELECT table_name AS name, table_type AS type
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY CASE WHEN table_name = '_prisma_migrations' THEN 1 ELSE 0 END, table_name
      `,
      this.prisma.$queryRaw<ColumnRow[]>`
        SELECT table_name AS "tableName", column_name AS name, data_type AS "dataType",
          udt_name AS "udtName", is_nullable AS nullable, column_default AS "defaultValue",
          ordinal_position AS position
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `,
      this.prisma.$queryRaw<RelationRow[]>`
        SELECT tc.table_name AS "tableName", kcu.column_name AS "columnName",
          ccu.table_name AS "foreignTableName", ccu.column_name AS "foreignColumnName"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, kcu.column_name
      `
    ])

    return {
      database: 'PostgreSQL',
      schema: 'public',
      updatedAt: new Date().toISOString(),
      tables: tables.map((table) => ({
        ...table,
        columns: columns.filter((column) => column.tableName === table.name).map((column) => ({
          ...column,
          description: FIELD_DESCRIPTIONS[`${column.tableName}.${column.name}`] || '数据库字段'
        })),
        relations: relations.filter((relation) => relation.tableName === table.name)
      }))
    }
  }
}
