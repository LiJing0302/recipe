import { Body, Controller, Get, Headers, Param, Post, Put, Query, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { CreateRecipeDto, ImportRecipeDto, RecipeCategoryDto } from './dto'
import { RecipesService } from './recipes.service'

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService, private readonly authService: AuthService) {}

  @Get('mine')
  listMine(@Query('includeImported') includeImported: string | undefined, @Headers('authorization') authorization?: string) {
    return this.recipesService.listMine(this.requireUser(authorization), includeImported !== 'false')
  }

  @Get('categories')
  listCategories() {
    return this.recipesService.listCategories()
  }

  @Get('categories/mine')
  listMineCategories(@Headers('authorization') authorization?: string) {
    return this.recipesService.listMineCategories(this.requireUser(authorization))
  }

  @Post('categories')
  createCategory(@Body() input: RecipeCategoryDto, @Headers('authorization') authorization?: string) {
    return this.recipesService.createCategory(input, this.requireUser(authorization))
  }

  @Put('categories/:categoryId')
  updateCategory(@Param('categoryId') categoryId: string, @Body() input: RecipeCategoryDto, @Headers('authorization') authorization?: string) {
    return this.recipesService.updateCategory(categoryId, input, this.requireUser(authorization))
  }

  @Post('categories/:categoryId/delete')
  deleteCategory(@Param('categoryId') categoryId: string, @Headers('authorization') authorization?: string) {
    return this.recipesService.removeCategory(categoryId, this.requireUser(authorization))
  }

  @Get('share-link')
  async createShareLink(@Headers('authorization') authorization?: string) {
    return { shareId: await this.recipesService.createShareId(this.requireUser(authorization)) }
  }

  @Get('shared/:shareId/categories')
  listSharedCategories(@Param('shareId') shareId: string) {
    return this.recipesService.listSharedCategories(shareId)
  }

  @Get('shared/:shareId/:recipeId')
  findSharedRecipe(@Param('shareId') shareId: string, @Param('recipeId') recipeId: string) {
    return this.recipesService.findSharedRecipe(shareId, recipeId)
  }

  @Get('shared/:shareId')
  listShared(@Param('shareId') shareId: string) {
    return this.recipesService.listShared(shareId)
  }

  @Get('public')
  listPublic(@Query('tag') tag?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.recipesService.listPublic(tag, Number(page) || 1, Number(pageSize) || 10)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id)
  }

  @Post(':id/import')
  import(@Param('id') id: string, @Body() input: ImportRecipeDto, @Headers('authorization') authorization?: string) {
    return this.recipesService.importRecipe(id, input, this.requireUser(authorization))
  }

  @Post()
  create(@Body() input: CreateRecipeDto, @Headers('authorization') authorization?: string) {
    return this.recipesService.create(input, this.requireUser(authorization))
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() input: CreateRecipeDto, @Headers('authorization') authorization?: string) {
    return this.recipesService.update(id, input, this.requireUser(authorization))
  }

  @Post(':id/delete')
  remove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.recipesService.remove(id, this.requireUser(authorization))
  }

  private requireUser(authorization?: string) {
    const userId = this.authService.verifyToken(authorization)
    if (!userId) throw new UnauthorizedException('请先登录')
    return userId
  }
}
