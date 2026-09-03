import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { RecipesModule } from './recipes/recipes.module'
import { UploadsModule } from './uploads/uploads.module'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module'
import { IngredientsModule } from './ingredients/ingredients.module'
import { BusinessModule } from './business/business.module'
import { AiModule } from './ai/ai.module'

@Module({
  imports: [PrismaModule, AuthModule, IngredientsModule, RecipesModule, UploadsModule, DatabaseModule, BusinessModule, AiModule]
})
export class AppModule {}
