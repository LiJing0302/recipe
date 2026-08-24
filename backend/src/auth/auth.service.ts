import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { User } from '@prisma/client'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { FAMILY_CATEGORIES } from '../recipes/category-classifier'
import { PrismaService } from '../prisma/prisma.service'
import { AccountCredentialsDto } from './dto'

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: AccountCredentialsDto) {
    const account = this.normalizeAccount(input.account)
    const existing = await this.prisma.user.findUnique({ where: { account }, select: { id: true } })
    if (existing) throw new ConflictException('账号已注册')

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          id: randomBytes(16).toString('hex'),
          account,
          passwordHash: this.hashPassword(input.password),
          name: account
        }
      })
      await tx.recipeCategory.createMany({ data: FAMILY_CATEGORIES.map((name, position) => ({ name, position, isDefault: true, userId: created.id })) })
      return created
    })

    return this.session(user)
  }

  async login(input: AccountCredentialsDto) {
    const account = this.normalizeAccount(input.account)
    const user = await this.prisma.user.findUnique({ where: { account } })
    if (!user?.passwordHash || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('账号或密码错误')
    }
    return this.session(user)
  }

  async currentUser(authorization?: string) {
    const userId = this.verifyToken(authorization)
    if (!userId) throw new UnauthorizedException('登录已失效，请重新登录')
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('用户不存在，请重新登录')
    return this.toProfile(user)
  }

  verifyToken(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) return undefined
    const token = authorization.slice(7)
    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) return undefined
    const expected = this.sign(encodedPayload)
    const providedBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return undefined
    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as { sub?: string; exp?: number }
      if (!payload.sub || !payload.exp || payload.exp < Date.now()) return undefined
      return payload.sub
    } catch {
      return undefined
    }
  }

  private session(user: User) {
    return { token: this.createToken(user.id), user: this.toProfile(user) }
  }

  private toProfile(user: User) {
    return {
      id: user.id,
      account: user.account || undefined,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      cookingDays: user.cookingDays,
      totalCooking: user.totalCooking,
      favoriteCount: user.favoriteCount
    }
  }

  private normalizeAccount(account: string) {
    return account.trim().toLowerCase()
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16)
    const hash = scryptSync(password, salt, 64)
    return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
  }

  private verifyPassword(password: string, stored: string) {
    const [, saltValue, hashValue] = stored.split('$')
    if (!saltValue || !hashValue) return false
    try {
      const expected = Buffer.from(hashValue, 'base64')
      const actual = scryptSync(password, Buffer.from(saltValue, 'base64'), expected.length)
      return actual.length === expected.length && timingSafeEqual(actual, expected)
    } catch {
      return false
    }
  }

  private createToken(userId: string) {
    const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
    return `${payload}.${this.sign(payload)}`
  }

  private sign(value: string) {
    return createHmac('sha256', process.env.AUTH_SECRET || 'recipe-ai-development-secret').update(value).digest('base64url')
  }
}
