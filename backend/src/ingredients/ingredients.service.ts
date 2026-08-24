import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { SaveIngredientProfileDto } from './dto'

const normalizeUnit = (value: string) => value.trim().toLowerCase()

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const profiles = await this.prisma.userIngredientProfile.findMany({
      where: { userId },
      include: { extraUnits: { where: { enabled: true }, orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' }
    })
    return profiles.map((profile) => this.toApi(profile))
  }

  async save(userId: string, input: SaveIngredientProfileDto) {
    const units = input.extraUnits.map((unit) => ({
      unitKey: normalizeUnit(unit.unitKey || unit.unit),
      unitName: unit.unit.trim(),
      baseUnit: unit.baseValue === undefined ? null : unit.baseUnit || 'g',
      baseValue: unit.baseValue === undefined ? null : String(unit.baseValue),
      enabled: unit.enabled !== false
    }))
    const unitKeys = units.map((unit) => unit.unitKey)
    if (new Set(unitKeys).size !== unitKeys.length) throw new BadRequestException('额外单位不能重复')

    const profile = await this.prisma.userIngredientProfile.upsert({
      where: { userId_ingredientKey: { userId, ingredientKey: input.ingredientKey } },
      update: {
        name: input.name.trim(),
        category: input.category.trim(),
        roomDays: Math.floor(input.roomDays),
        fridgeDays: Math.floor(input.fridgeDays),
        frozenDays: Math.floor(input.frozenDays),
        fridgeSuitable: input.fridgeSuitable,
        showExtraUnit: input.showExtraUnit,
        extraUnits: {
          deleteMany: {},
          create: units
        }
      },
      create: {
        userId,
        ingredientKey: input.ingredientKey,
        name: input.name.trim(),
        category: input.category.trim(),
        roomDays: Math.floor(input.roomDays),
        fridgeDays: Math.floor(input.fridgeDays),
        frozenDays: Math.floor(input.frozenDays),
        fridgeSuitable: input.fridgeSuitable,
        showExtraUnit: input.showExtraUnit,
        extraUnits: { create: units }
      },
      include: { extraUnits: { orderBy: { createdAt: 'asc' } } }
    })
    return this.toApi(profile)
  }

  async remove(userId: string, ingredientKey: string) {
    await this.prisma.userIngredientProfile.deleteMany({ where: { userId, ingredientKey } })
    return { ingredientKey }
  }

  private toApi(profile: { ingredientKey: string; name: string; category: string; roomDays: number; fridgeDays: number; frozenDays: number; fridgeSuitable: boolean; showExtraUnit: boolean; extraUnits: Array<{ unitKey: string; unitName: string; baseUnit: string | null; baseValue: unknown; enabled: boolean }> }) {
    return {
      ingredientKey: profile.ingredientKey,
      name: profile.name,
      category: profile.category,
      roomDays: profile.roomDays,
      fridgeDays: profile.fridgeDays,
      frozenDays: profile.frozenDays,
      fridgeSuitable: profile.fridgeSuitable,
      showExtraUnit: profile.showExtraUnit,
      extraUnits: profile.extraUnits.filter((unit) => unit.enabled).map((unit) => ({
        unit: unit.unitName,
        unitKey: unit.unitKey,
        ...(unit.baseValue === null ? {} : { baseUnit: unit.baseUnit, baseValue: Number(unit.baseValue) })
      }))
    }
  }
}
