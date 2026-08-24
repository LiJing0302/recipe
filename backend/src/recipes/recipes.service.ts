import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CreateRecipeDto, ImportRecipeDto, RecipeCategoryDto } from './dto'
import { DEFAULT_FAMILY_CATEGORY, FAMILY_CATEGORIES } from './category-classifier'
import { parseStoredIngredientAmount, type StoredIngredientAmount } from './ingredient-amount'
import { PrismaService } from '../prisma/prisma.service'
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'

const recipeInclude = {
  author: true,
  importRecord: {
    include: {
      originRecipe: { include: { author: true } }
    }
  }
}

const recipeSummaryInclude = { author: true }
const SHARE_CIPHER = 'aes-256-gcm'
const SHARE_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const SHARE_CODE_LENGTH = 10

type RecipeWithRelations = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>
type RecipeSummary = Prisma.RecipeGetPayload<{ include: typeof recipeSummaryInclude }>
type StoredIngredient = { id: string; name: string; amount: StoredIngredientAmount; optional: boolean; ingredientKey?: string; sourceName?: string; matchMethod?: string; confidence?: number }
type StoredStep = { id: string; title: string; description: string; duration: number | null; tip: string | null; images: string[] }

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string, includeImported = true) {
    await this.ensureUser(userId)
    const recipes = await this.prisma.recipe.findMany({ where: { authorId: userId, ...(includeImported ? {} : { importRecord: null }) }, include: recipeInclude, orderBy: { createdAt: 'desc' } })
    return recipes.map((recipe) => this.toApiRecipe(recipe))
  }

  async createShareId(userId: string) {
    await this.ensureUser(userId)
    const existing = await this.prisma.recipeShareLink.findUnique({ where: { userId } })
    if (existing) return this.decryptShareCode(existing.codeCiphertext)

    const shareId = this.randomShareId()
    try {
      await this.prisma.recipeShareLink.create({
        data: {
          codeHash: this.hashShareCode(shareId),
          codeCiphertext: this.encryptShareCode(shareId),
          userId
        }
      })
      return shareId
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.recipeShareLink.findUnique({ where: { userId } })
        if (raced) return this.decryptShareCode(raced.codeCiphertext)
      }
      throw error
    }
  }

  async listShared(shareId: string) {
    const userId = await this.resolveShareId(shareId)
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw new NotFoundException('分享链接无效')
    const recipes = await this.prisma.recipe.findMany({ where: { authorId: userId }, include: recipeSummaryInclude, orderBy: { createdAt: 'desc' } })
    return recipes.map((recipe) => this.toApiRecipeSummary(recipe))
  }

  async listSharedCategories(shareId: string) {
    const userId = await this.resolveShareId(shareId)
    const [categories, recipes] = await Promise.all([
      this.prisma.recipeCategory.findMany({ where: { userId, name: { not: DEFAULT_FAMILY_CATEGORY } }, orderBy: { position: 'asc' } }),
      this.prisma.recipe.findMany({ where: { authorId: userId }, select: { categories: true } })
    ])
    const validNames = new Set(categories.map((category) => category.name))
    const counts = new Map(categories.map((category) => [category.name, 0]))
    let uncategorizedCount = 0
    for (const recipe of recipes) {
      const category = recipe.categories.find((name) => validNames.has(name))
      if (category) counts.set(category, (counts.get(category) || 0) + 1)
      else uncategorizedCount += 1
    }
    return [
      { id: 'uncategorized', name: DEFAULT_FAMILY_CATEGORY, count: uncategorizedCount, position: -1, isDefault: true },
      ...categories.map((category) => ({ ...category, count: counts.get(category.name) || 0 }))
    ]
  }

  async findSharedRecipe(shareId: string, recipeId: string) {
    const userId = await this.resolveShareId(shareId)
    const recipe = await this.prisma.recipe.findFirst({ where: { id: recipeId, authorId: userId }, include: recipeInclude })
    if (!recipe) throw new NotFoundException('分享食谱不存在')
    return this.toApiRecipe(recipe)
  }

  async listCategories() {
    return this.prisma.$queryRaw<Array<{ name: string; count: number }>>`
      SELECT category AS name, COUNT(*)::int AS count
      FROM "Recipe", unnest("categories") AS category
      WHERE "isPublic" = true AND category <> ''
      GROUP BY category
      ORDER BY CASE category
        WHEN '快手早餐' THEN 1
        WHEN '冷盘凉菜' THEN 2
        WHEN '荤菜主菜' THEN 3
        WHEN '素菜家常' THEN 4
        WHEN '米面主食' THEN 5
        WHEN '汤粥煲汤' THEN 6
        WHEN '小吃点心' THEN 7
        WHEN '饮品酒水' THEN 8
        ELSE 99
      END
    `
  }

  async listMineCategories(userId: string) {
    await this.ensureUser(userId)
    const [categories, recipes] = await Promise.all([
      this.prisma.recipeCategory.findMany({ where: { userId, name: { not: DEFAULT_FAMILY_CATEGORY } }, orderBy: { position: 'asc' } }),
      this.prisma.recipe.findMany({ where: { authorId: userId }, select: { categories: true } })
    ])
    const validNames = new Set(categories.map((category) => category.name))
    const counts = new Map(categories.map((category) => [category.name, 0]))
    let uncategorizedCount = 0
    for (const recipe of recipes) {
      const category = recipe.categories.find((name) => validNames.has(name))
      if (category) counts.set(category, (counts.get(category) || 0) + 1)
      else uncategorizedCount += 1
    }
    return [
      { id: 'uncategorized', name: DEFAULT_FAMILY_CATEGORY, count: uncategorizedCount, position: -1, isDefault: true },
      ...categories.map((category) => ({ ...category, count: counts.get(category.name) || 0 }))
    ]
  }

  async createCategory(input: RecipeCategoryDto, userId: string) {
    const user = await this.ensureUser(userId)
    const name = input.name.trim()
    if (!name || name === DEFAULT_FAMILY_CATEGORY) throw new BadRequestException('分类名称无效')
    const existing = await this.prisma.recipeCategory.findUnique({ where: { userId_name: { userId: user.id, name } } })
    if (existing) throw new ConflictException('分类名称已存在')
    const position = ((await this.prisma.recipeCategory.aggregate({ where: { userId: user.id }, _max: { position: true } }))._max.position ?? -1) + 1
    return this.prisma.recipeCategory.create({ data: { name, position, userId: user.id, isDefault: false } })
  }

  async updateCategory(id: string, input: RecipeCategoryDto, userId: string) {
    const name = input.name.trim()
    if (!name || name === DEFAULT_FAMILY_CATEGORY) throw new BadRequestException('分类名称无效')
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.recipeCategory.findFirst({ where: { id, userId } })
      if (!current) throw new NotFoundException('分类不存在')
      const duplicate = await tx.recipeCategory.findFirst({ where: { userId, name, id: { not: id } }, select: { id: true } })
      if (duplicate) throw new ConflictException('分类名称已存在')
      const recipes = await tx.recipe.findMany({ where: { authorId: userId, categories: { has: current.name } }, select: { id: true, categories: true } })
      const category = await tx.recipeCategory.update({ where: { id }, data: { name } })
      for (const recipe of recipes) {
        await tx.recipe.update({ where: { id: recipe.id }, data: { categories: recipe.categories.map((item) => item === current.name ? name : item) } })
      }
      return category
    })
  }

  async removeCategory(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.recipeCategory.findFirst({ where: { id, userId } })
      if (!current) throw new NotFoundException('分类不存在')
      const recipes = await tx.recipe.findMany({ where: { authorId: userId, categories: { has: current.name } }, select: { id: true, categories: true } })
      await tx.recipeCategory.delete({ where: { id } })
      for (const recipe of recipes) {
        await tx.recipe.update({ where: { id: recipe.id }, data: { categories: recipe.categories.filter((item) => item !== current.name) } })
      }
      return { id }
    })
  }

  async listPublic(tag = '', page = 1, pageSize = 30) {
    const normalizedPage = Math.max(1, Math.floor(page))
    const normalizedPageSize = Math.min(60, Math.max(1, Math.floor(pageSize)))
    const normalizedTag = tag.trim()
    const where: Prisma.RecipeWhereInput = {
      isPublic: true,
      ...(normalizedTag ? { categories: { has: normalizedTag } } : {})
    }
    const [total, recipes] = await Promise.all([
      this.prisma.recipe.count({ where }),
      this.prisma.recipe.findMany({
        where,
        include: recipeSummaryInclude,
        orderBy: [{ cookingCount: 'desc' }, { createdAt: 'desc' }],
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize
      })
    ])
    return {
      items: recipes.map((recipe) => this.toApiRecipeSummary(recipe)),
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      hasMore: normalizedPage * normalizedPageSize < total
    }
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id }, include: recipeInclude })
    if (!recipe) throw new NotFoundException('食谱不存在')
    return this.toApiRecipe(recipe)
  }

  async importRecipe(originRecipeId: string, input: ImportRecipeDto, userId: string) {
    const user = await this.ensureUser(userId)
    const existing = await this.prisma.recipeImport.findUnique({ where: { ownerId_originRecipeId: { ownerId: user.id, originRecipeId } }, include: { copiedRecipe: { include: recipeInclude } } })
    if (existing) return this.toApiRecipe(existing.copiedRecipe)

    const origin = await this.prisma.recipe.findFirst({ where: { id: originRecipeId, isPublic: true }, include: { author: true } })
    if (!origin) throw new NotFoundException('公开食谱不存在')
    if (origin.authorId === user.id) throw new BadRequestException('不能导入自己的食谱')

    const validCategories = new Set((await this.prisma.recipeCategory.findMany({ where: { userId: user.id }, select: { name: true } })).map((category) => category.name))
    const category = input.category?.trim()
    const categories = category && validCategories.has(category) ? [category] : []
    const mappings = new Map((input.ingredientMappings || []).map((mapping) => [mapping.sourceName.trim(), mapping]))
    const originIngredients = this.readIngredients(origin.ingredients)

    try {
      const copiedId = await this.prisma.$transaction(async (tx) => {
        const ingredients: StoredIngredient[] = []
        for (const ingredient of originIngredients) {
          const mapping = mappings.get(ingredient.name.trim())
          if (!mapping) {
            ingredients.push(ingredient)
            continue
          }
          ingredients.push({ ...ingredient, sourceName: ingredient.name, ingredientKey: mapping.ingredientKey, matchMethod: mapping.matchMethod, ...(mapping.confidence === undefined ? {} : { confidence: mapping.confidence }) })
        }
        const copied = await tx.recipe.create({
          data: {
            title: origin.title,
            subtitle: origin.subtitle,
            cover: origin.cover,
            source: 'community',
            authorId: user.id,
            categories,
            tags: origin.tags,
            flavor: origin.flavor,
            servings: origin.servings,
            duration: origin.duration,
            difficulty: origin.difficulty,
            rating: 0,
            ratingCount: 0,
            cookingCount: 0,
            skillLevel: origin.skillLevel,
            isPublic: false,
            ingredients: ingredients as unknown as Prisma.InputJsonValue,
            steps: origin.steps ?? []
          }
        })
        await tx.recipeImport.create({ data: { ownerId: user.id, originRecipeId: origin.id, originAuthorId: origin.authorId, copiedRecipeId: copied.id } })
        for (const mapping of input.ingredientMappings || []) {
          if (mapping.matchMethod !== 'ai' && mapping.matchMethod !== 'manual') continue
          const sourceName = mapping.sourceName.trim()
          const normalizedSourceName = sourceName.replace(/[\s·、，,。！？!?:：/\\]/g, '').toLowerCase()
          await tx.userIngredientMapping.upsert({
            where: { userId_normalizedSourceName: { userId: user.id, normalizedSourceName } },
            create: { userId: user.id, sourceName, normalizedSourceName, ingredientKey: mapping.ingredientKey, targetName: mapping.targetName, targetCategory: mapping.targetCategory, matchMethod: mapping.matchMethod, confidence: mapping.confidence, confirmedAt: new Date() },
            update: { sourceName, ingredientKey: mapping.ingredientKey, targetName: mapping.targetName, targetCategory: mapping.targetCategory, matchMethod: mapping.matchMethod, confidence: mapping.confidence, confirmedAt: new Date() }
          })
        }
        for (const sourceName of input.clearedIngredientNames || []) {
          await tx.userIngredientMapping.deleteMany({ where: { userId: user.id, normalizedSourceName: sourceName.replace(/[\s·、，,。！？!?:：/\\]/g, '').toLowerCase() } })
        }
        return copied.id
      })
      const copied = await this.prisma.recipe.findUniqueOrThrow({ where: { id: copiedId }, include: recipeInclude })
      return this.toApiRecipe(copied)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.recipeImport.findUnique({ where: { ownerId_originRecipeId: { ownerId: user.id, originRecipeId } }, include: { copiedRecipe: { include: recipeInclude } } })
        if (raced) return this.toApiRecipe(raced.copiedRecipe)
      }
      throw error
    }
  }

  async create(input: CreateRecipeDto, userId: string) {
    const user = await this.ensureUser(userId)
    const recipe = await this.prisma.recipe.create({
      data: {
        ...await this.recipeFields(input, user.id),
        author: { connect: { id: user.id } }
      },
      include: recipeInclude
    })
    return this.toApiRecipe(recipe)
  }

  async update(id: string, input: CreateRecipeDto, userId: string) {
    const current = await this.prisma.recipe.findFirst({ where: { id, authorId: userId } })
    if (!current) throw new NotFoundException('没有权限修改这道食谱')

    const recipe = await this.prisma.recipe.update({
      where: { id },
      data: await this.recipeFields(input, userId),
      include: recipeInclude
    })
    return this.toApiRecipe(recipe)
  }

  async remove(id: string, userId: string) {
    const recipe = await this.prisma.recipe.findFirst({ where: { id, authorId: userId }, select: { id: true } })
    if (!recipe) throw new NotFoundException('没有权限删除这道食谱')
    await this.prisma.recipe.delete({ where: { id: recipe.id } })
    return { id: recipe.id }
  }

  private async ensureUser(userId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } })
    if (existing) return existing
    const user = await this.prisma.user.create({ data: { id: userId, name: userId === 'me' ? '林小满' : '新用户' } })
    await this.prisma.recipeCategory.createMany({ data: FAMILY_CATEGORIES.map((name, position) => ({ name, position, isDefault: true, userId: user.id })) })
    return user
  }

  private async resolveShareId(shareId: string) {
    try {
      if (!new RegExp(`^[${SHARE_CODE_ALPHABET}]{${SHARE_CODE_LENGTH}}$`).test(shareId)) throw new Error('Invalid share id')
      const link = await this.prisma.recipeShareLink.findUnique({ where: { codeHash: this.hashShareCode(shareId) } })
      if (!link) throw new Error('Unknown share id')
      return link.userId
    } catch {
      throw new NotFoundException('分享链接无效')
    }
  }

  private randomShareId() {
    const bytes = randomBytes(SHARE_CODE_LENGTH)
    return [...bytes].map((byte) => SHARE_CODE_ALPHABET[byte % SHARE_CODE_ALPHABET.length]).join('')
  }

  private hashShareCode(shareId: string) {
    return createHash('sha256').update(shareId).digest('hex')
  }

  private encryptShareCode(shareId: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv(SHARE_CIPHER, this.shareKey(), iv)
    const encrypted = Buffer.concat([cipher.update(shareId, 'utf8'), cipher.final()])
    return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString('base64url')).join('.')
  }

  private decryptShareCode(value: string) {
    const [ivValue, encryptedValue, tagValue] = value.split('.')
    if (!ivValue || !encryptedValue || !tagValue) throw new Error('Invalid stored share code')
    const decipher = createDecipheriv(SHARE_CIPHER, this.shareKey(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8')
  }

  private shareKey() {
    return createHash('sha256').update(process.env.SHARE_SECRET || process.env.AUTH_SECRET || 'recipe-ai-development-secret').digest()
  }

  private async recipeFields(input: CreateRecipeDto, userId: string): Promise<Pick<Prisma.RecipeCreateInput, 'title' | 'subtitle' | 'cover' | 'source' | 'categories' | 'tags' | 'flavor' | 'servings' | 'duration' | 'difficulty' | 'isPublic' | 'ingredients' | 'steps'>> {
    const userCategories = await this.prisma.recipeCategory.findMany({ where: { userId }, select: { name: true } })
    const validNames = new Set(userCategories.map((category) => category.name))
    const categories = [...new Set(input.categories.map((category) => category.trim()).filter((category) => validNames.has(category)))].slice(0, 1)
    return {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || '',
      cover: input.cover?.trim() || '',
      source: 'user',
      categories,
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
      flavor: input.flavor.trim(),
      servings: input.servings,
      duration: input.duration,
      difficulty: input.difficulty,
      isPublic: input.isPublic,
      ingredients: this.ingredientData(input) as unknown as Prisma.InputJsonValue,
      steps: this.stepData(input)
    }
  }

  private ingredientData(input: CreateRecipeDto) {
    return input.ingredients.map((item) => ({
      id: randomUUID(),
      name: item.name.trim(),
      amount: parseStoredIngredientAmount(item.amount),
      optional: item.optional || false,
      ...(item.ingredientKey?.trim() ? { ingredientKey: item.ingredientKey.trim() } : {}),
      ...(item.sourceName?.trim() ? { sourceName: item.sourceName.trim() } : {}),
      ...(item.matchMethod ? { matchMethod: item.matchMethod } : {}),
      ...(item.confidence === undefined ? {} : { confidence: item.confidence })
    }))
  }

  private stepData(input: CreateRecipeDto) {
    return input.steps.map((step) => ({ id: randomUUID(), title: step.title.trim(), description: step.description.trim(), duration: step.duration ?? null, tip: step.tip?.trim() || null, images: step.images || [] }))
  }

  private toApiRecipe(recipe: RecipeWithRelations) {
    const importRecord = recipe.importRecord
    return {
      id: recipe.id,
      title: recipe.title,
      subtitle: recipe.subtitle,
      cover: this.publicImageUrl(recipe.cover),
      source: recipe.source,
      isImported: Boolean(importRecord),
      originRecipeId: importRecord?.originRecipeId,
      originAuthorId: importRecord?.originAuthorId,
      originAuthorName: importRecord?.originRecipe.author.name,
      importedAt: importRecord?.importedAt.toISOString(),
      authorId: recipe.authorId,
      authorName: recipe.author.name,
      authorAvatar: recipe.author.avatar,
      categories: recipe.categories,
      ingredients: this.readIngredients(recipe.ingredients),
      steps: this.readSteps(recipe.steps),
      tags: recipe.tags,
      flavor: recipe.flavor,
      servings: recipe.servings,
      duration: recipe.duration,
      difficulty: recipe.difficulty,
      rating: recipe.rating,
      ratingCount: recipe.ratingCount,
      cookingCount: recipe.cookingCount,
      skillLevel: recipe.skillLevel,
      isPublic: recipe.isPublic,
      createdAt: recipe.createdAt.toISOString().slice(0, 10)
    }
  }

  private toApiRecipeSummary(recipe: RecipeSummary) {
    return {
      id: recipe.id,
      title: recipe.title,
      subtitle: recipe.subtitle,
      cover: this.publicImageUrl(recipe.cover),
      source: recipe.source,
      authorId: recipe.authorId,
      authorName: recipe.author.name,
      authorAvatar: recipe.author.avatar,
      categories: recipe.categories,
      ingredients: [],
      steps: [],
      tags: recipe.tags,
      flavor: recipe.flavor,
      servings: recipe.servings,
      duration: recipe.duration,
      difficulty: recipe.difficulty,
      rating: recipe.rating,
      ratingCount: recipe.ratingCount,
      cookingCount: recipe.cookingCount,
      skillLevel: recipe.skillLevel,
      isPublic: recipe.isPublic,
      createdAt: recipe.createdAt.toISOString().slice(0, 10)
    }
  }

  private publicImageUrl(image: string) {
    if (!image) return image
    const uploadPathIndex = image.indexOf('/upload/')
    const host = image.includes('cp2.douguo.net') ? 'cp2.douguo.net' : image.includes('douguo.net') ? 'cp1.douguo.net' : ''
    if (!host || uploadPathIndex < 0) return image
    const baseUrl = (process.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
    const sourceUrl = `http://${host}${image.slice(uploadPathIndex)}`
    return `${baseUrl}/api/uploads/external?url=${encodeURIComponent(sourceUrl)}`
  }

  private readIngredients(value: Prisma.JsonValue): StoredIngredient[] {
    if (!Array.isArray(value)) return []
    return value.map((item) => {
      const ingredient = item as Partial<StoredIngredient> & { unit?: string }
      const { unit: legacyUnit, ...withoutLegacyUnit } = ingredient
      return {
        ...withoutLegacyUnit,
        id: ingredient.id || randomUUID(),
        name: String(ingredient.name || '').trim(),
        amount: parseStoredIngredientAmount(ingredient.amount, legacyUnit),
        optional: Boolean(ingredient.optional)
      }
    }) as StoredIngredient[]
  }

  private readSteps(value: Prisma.JsonValue) {
    return this.readStoredSteps(value).map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      duration: step.duration ?? undefined,
      tip: step.tip ?? undefined,
      images: step.images.map((image) => this.publicImageUrl(image))
    }))
  }

  private readStoredSteps(value: Prisma.JsonValue): StoredStep[] {
    if (!Array.isArray(value)) return []
    return value as unknown as StoredStep[]
  }
}
