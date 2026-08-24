import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Put, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { SaveIngredientProfileDto } from './dto'
import { IngredientsService } from './ingredients.service'

@Controller('ingredient-configs')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService, private readonly authService: AuthService) {}

  @Get()
  list(@Headers('authorization') authorization?: string) {
    return this.ingredientsService.list(this.requireUser(authorization))
  }

  @Put(':ingredientKey')
  save(@Param('ingredientKey') ingredientKey: string, @Body() input: SaveIngredientProfileDto, @Headers('authorization') authorization?: string) {
    if (decodeURIComponent(ingredientKey) !== input.ingredientKey) throw new BadRequestException('食材标识不一致')
    return this.ingredientsService.save(this.requireUser(authorization), input)
  }

  @Delete(':ingredientKey')
  remove(@Param('ingredientKey') ingredientKey: string, @Headers('authorization') authorization?: string) {
    return this.ingredientsService.remove(this.requireUser(authorization), decodeURIComponent(ingredientKey))
  }

  private requireUser(authorization?: string) {
    const userId = this.authService.verifyToken(authorization)
    if (!userId) throw new UnauthorizedException('请先登录')
    return userId
  }
}
