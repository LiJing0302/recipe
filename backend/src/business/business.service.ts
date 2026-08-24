import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { BasketItemInput, CookingInput, IngredientCategoryInput, IngredientMappingInput, InventoryInput, MenuInput, OrderInput, PurchaseInput } from './dto'

const normalize = (value: string) => value.trim().replace(/[\s·、，,。！？!?:：/\\]/g, '').toLowerCase()
const dateOnly = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new BadRequestException('日期格式无效')
  return date
}
const dateText = (value: Date) => value.toISOString().slice(0, 10)
const decimal = (value: unknown, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return new Prisma.Decimal(fallback)
  return new Prisma.Decimal(number)
}
const json = (value: unknown) => value as Prisma.InputJsonValue

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async categories(userId: string) {
    return this.prisma.userIngredientCategory.findMany({ where: { userId }, orderBy: { position: 'asc' } })
  }

  async createCategory(userId: string, input: IngredientCategoryInput) {
    const name = input.name.trim()
    if (!name) throw new BadRequestException('分类名称不能为空')
    const position = ((await this.prisma.userIngredientCategory.aggregate({ where: { userId }, _max: { position: true } }))._max.position ?? -1) + 1
    try { return await this.prisma.userIngredientCategory.create({ data: { userId, name, position } }) } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('分类名称已存在')
      throw error
    }
  }

  async updateCategory(userId: string, id: string, input: IngredientCategoryInput) {
    const name = input.name.trim()
    const current = await this.prisma.userIngredientCategory.findFirst({ where: { id, userId } })
    if (!current) throw new NotFoundException('分类不存在')
    try { return await this.prisma.userIngredientCategory.update({ where: { id }, data: { name } }) } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('分类名称已存在')
      throw error
    }
  }

  async deleteCategory(userId: string, id: string) {
    const current = await this.prisma.userIngredientCategory.findFirst({ where: { id, userId } })
    if (!current) throw new NotFoundException('分类不存在')
    await this.prisma.userIngredientCategory.delete({ where: { id } })
    return { id }
  }

  async mappings(userId: string) {
    const mappings = await this.prisma.userIngredientMapping.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } })
    return mappings.map((mapping) => ({ ...mapping, confidence: mapping.confidence === null ? undefined : Number(mapping.confidence) }))
  }

  async saveMapping(userId: string, sourceKey: string, input: IngredientMappingInput) {
    const sourceName = input.sourceName.trim()
    const mapping = await this.prisma.userIngredientMapping.upsert({
      where: { userId_normalizedSourceName: { userId, normalizedSourceName: normalize(sourceName || sourceKey) } },
      create: { userId, sourceName, normalizedSourceName: normalize(sourceName || sourceKey), ingredientKey: input.ingredientKey, targetName: input.targetName, targetCategory: input.targetCategory, matchMethod: input.matchMethod, confidence: input.confidence === undefined ? undefined : decimal(input.confidence), confirmedAt: new Date() },
      update: { sourceName, ingredientKey: input.ingredientKey, targetName: input.targetName, targetCategory: input.targetCategory, matchMethod: input.matchMethod, confidence: input.confidence === undefined ? null : decimal(input.confidence), confirmedAt: new Date() }
    })
    return { ...mapping, confidence: mapping.confidence === null ? undefined : Number(mapping.confidence) }
  }

  async deleteMapping(userId: string, sourceKey: string) {
    await this.prisma.userIngredientMapping.deleteMany({ where: { userId, normalizedSourceName: normalize(sourceKey) } })
    return { sourceKey }
  }

  private inventoryApi(batch: any) {
    return { ...batch, purchasedAt: dateText(batch.purchasedAt), ...(batch.expiresAt ? { expiresAt: dateText(batch.expiresAt) } : {}) }
  }

  async inventory(userId: string) {
    const batches = await this.prisma.inventoryBatch.findMany({ where: { userId }, orderBy: { purchasedAt: 'desc' } })
    return batches.map((batch) => this.inventoryApi(batch))
  }

  async createInventory(userId: string, input: InventoryInput) {
    const batch = await this.prisma.inventoryBatch.create({ data: this.inventoryData(userId, input) })
    return this.inventoryApi(batch)
  }

  async updateInventory(userId: string, id: string, input: InventoryInput) {
    const current = await this.prisma.inventoryBatch.findFirst({ where: { id, userId } })
    if (!current) throw new NotFoundException('库存批次不存在')
    const batch = await this.prisma.inventoryBatch.update({ where: { id }, data: this.inventoryData(userId, input) })
    return this.inventoryApi(batch)
  }

  async deleteInventory(userId: string, id: string) {
    const result = await this.prisma.inventoryBatch.deleteMany({ where: { id, userId } })
    if (!result.count) throw new NotFoundException('库存批次不存在')
    return { id }
  }

  private inventoryData(userId: string, input: InventoryInput) {
    return { userId, name: input.name.trim(), normalizedName: normalize(input.name), ingredientKey: input.ingredientKey, category: input.category || '其他', purchasedAt: dateOnly(input.purchasedAt), sourceType: input.sourceType || 'manual', recipeId: input.recipeId, recipeTitle: input.recipeTitle, basketItemId: input.basketItemId, storageMode: input.storageMode || 'chilled', expiresAt: input.expiresAt ? dateOnly(input.expiresAt) : undefined }
  }

  private basketApi(item: any) {
    return { ...item, addedAt: item.addedAt.toISOString(), ...(item.sourceConversion ? { sourceConversion: item.sourceConversion } : {}) }
  }

  async basket(userId: string) {
    return (await this.prisma.basketItem.findMany({ where: { userId }, orderBy: { addedAt: 'desc' } })).map((item) => this.basketApi(item))
  }

  async addBasket(userId: string, input: BasketItemInput) {
    const existing = await this.prisma.basketItem.findUnique({ where: { userId_recipeId_ingredientId: { userId, recipeId: input.recipeId, ingredientId: input.ingredientId } } })
    if (existing) return this.basketApi(existing)
    const item = await this.prisma.basketItem.create({ data: { userId, ingredientId: input.ingredientId, ingredientName: input.ingredientName, ingredientKey: input.ingredientKey, matchMethod: undefined, amount: json(input.amount), sourceConversion: input.sourceConversion ? json(input.sourceConversion) : undefined, recipeId: input.recipeId, recipeTitle: input.recipeTitle, recipeCover: input.recipeCover } })
    return this.basketApi(item)
  }

  async deleteBasketItem(userId: string, id: string) {
    const result = await this.prisma.basketItem.deleteMany({ where: { id, userId } })
    if (!result.count) throw new NotFoundException('菜篮子条目不存在')
    return { id }
  }

  async deleteBasketRecipe(userId: string, recipeId: string) {
    await this.prisma.basketItem.deleteMany({ where: { userId, recipeId } })
    return { recipeId }
  }

  async purchase(userId: string, input: PurchaseInput) {
    if (!input.items.length) throw new BadRequestException('没有待采购食材')
    return this.prisma.$transaction(async (tx) => {
      const ids = input.items.map((item) => item.basketItemId)
      const basket = await tx.basketItem.findMany({ where: { userId, id: { in: ids } } })
      if (basket.length !== ids.length) throw new NotFoundException('菜篮子条目不存在或无权操作')
      const batches = []
      for (const item of input.items) {
        const source = basket.find((candidate) => candidate.id === item.basketItemId)!
        const batch = await tx.inventoryBatch.create({ data: this.inventoryData(userId, { ...item, name: source.ingredientName, ingredientKey: item.ingredientKey || source.ingredientKey || undefined, recipeId: source.recipeId, recipeTitle: source.recipeTitle, sourceType: 'recipe', basketItemId: source.id }) })
        batches.push(this.inventoryApi(batch))
      }
      await tx.basketItem.deleteMany({ where: { userId, id: { in: ids } } })
      return { batches, removedIds: ids }
    })
  }

  private menuApi(item: any) {
    return { id: item.id, date: dateText(item.date), meal: item.meal, recipeId: item.recipeId, recipeTitle: item.recipe.title, cover: item.recipe.cover, source: item.recipe.author.name, ...(item.orderedBy ? { orderedBy: item.orderedBy } : {}), ...(item.note ? { note: item.note } : {}) }
  }

  async menu(userId: string, date?: string) {
    const items = await this.prisma.menuEntry.findMany({ where: { userId, ...(date ? { date: dateOnly(date) } : {}) }, include: { recipe: { include: { author: true } } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] })
    return items.map((item) => this.menuApi(item))
  }

  async addMenu(userId: string, input: MenuInput) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: input.recipeId }, include: { author: true } })
    if (!recipe) throw new NotFoundException('食谱不存在')
    try {
      const entry = await this.prisma.menuEntry.create({ data: { userId, date: dateOnly(input.date), meal: input.meal, recipeId: input.recipeId, orderedBy: input.orderedBy || '', note: input.note }, include: { recipe: { include: { author: true } } } })
      return this.menuApi(entry)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return this.menuEntry(userId, input)
      throw error
    }
  }

  private async menuEntry(userId: string, input: MenuInput) {
    const entry = await this.prisma.menuEntry.findFirst({ where: { userId, date: dateOnly(input.date), meal: input.meal, recipeId: input.recipeId, orderedBy: input.orderedBy || '' }, include: { recipe: { include: { author: true } } } })
    if (!entry) throw new NotFoundException('菜单条目不存在')
    return this.menuApi(entry)
  }

  async deleteMenu(userId: string, id: string) { await this.prisma.menuEntry.deleteMany({ where: { id, userId } }); return { id } }

  async following(userId: string) { return (await this.prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } })).map((item) => item.followingId) }
  async follow(userId: string, targetId: string) { if (userId === targetId) throw new BadRequestException('不能关注自己'); await this.prisma.userFollow.upsert({ where: { followerId_followingId: { followerId: userId, followingId: targetId } }, create: { followerId: userId, followingId: targetId }, update: {} }); return { following: true, userId: targetId } }
  async unfollow(userId: string, targetId: string) { await this.prisma.userFollow.deleteMany({ where: { followerId: userId, followingId: targetId } }); return { following: false, userId: targetId } }
  async collections(userId: string) { return (await this.prisma.recipeCollection.findMany({ where: { userId }, select: { recipeId: true } })).map((item) => item.recipeId) }
  async collect(userId: string, recipeId: string) { await this.prisma.recipeCollection.upsert({ where: { userId_recipeId: { userId, recipeId } }, create: { userId, recipeId }, update: {} }); return { collected: true, recipeId } }
  async uncollect(userId: string, recipeId: string) { await this.prisma.recipeCollection.deleteMany({ where: { userId, recipeId } }); return { collected: false, recipeId } }

  async orders(userId: string, date?: string) { return (await this.prisma.order.findMany({ where: { userId, ...(date ? { date: dateOnly(date) } : {}) }, orderBy: { createdAt: 'desc' } })).map((item) => ({ ...item, date: dateText(item.date), createdAt: item.createdAt.toISOString() })) }
  async createOrder(userId: string, input: OrderInput) { return this.prisma.$transaction(async (tx) => { const recipe = await tx.recipe.findUnique({ where: { id: input.recipeId } }); if (!recipe) throw new NotFoundException('食谱不存在'); const order = await tx.order.create({ data: { userId, recipeId: input.recipeId, recipeTitle: input.recipeTitle || recipe.title, hostName: input.hostName, guestName: input.guestName, date: dateOnly(input.date), note: input.note, status: input.status || 'pending' } }); await tx.menuEntry.upsert({ where: { userId_date_meal_recipeId_orderedBy: { userId, date: dateOnly(input.date), meal: 'dinner', recipeId: input.recipeId, orderedBy: input.guestName } }, create: { userId, date: dateOnly(input.date), meal: 'dinner', recipeId: input.recipeId, orderedBy: input.guestName, note: input.note }, update: {} }); return { ...order, date: dateText(order.date), createdAt: order.createdAt.toISOString() } }) }
  async updateOrder(userId: string, id: string, status: string) { const order = await this.prisma.order.updateMany({ where: { id, userId }, data: { status } }); if (!order.count) throw new NotFoundException('订单不存在'); return this.orders(userId).then((items) => items.find((item) => item.id === id)) }
  async cookingRecords(userId: string) { return (await this.prisma.cookingRecord.findMany({ where: { userId }, orderBy: { date: 'desc' } })).map((item) => ({ ...item, date: dateText(item.date) })) }
  async createCookingRecord(userId: string, input: CookingInput) { return this.prisma.$transaction(async (tx) => { const date = dateOnly(input.date); const hasRecordOnDate = await tx.cookingRecord.findFirst({ where: { userId, date }, select: { id: true } }); const record = await tx.cookingRecord.create({ data: { ...input, userId, date, duration: Math.max(0, Math.round(input.duration)), rating: Math.max(0, Math.min(5, Math.round(input.rating))) } }); await tx.user.update({ where: { id: userId }, data: { totalCooking: { increment: 1 }, ...(hasRecordOnDate ? {} : { cookingDays: { increment: 1 } }) } }); return { ...record, date: dateText(record.date) } }) }
}
