import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { BusinessController } from './business.controller'
import { BusinessService } from './business.service'

@Module({ imports: [PrismaModule, AuthModule], controllers: [BusinessController], providers: [BusinessService] })
export class BusinessModule {}
