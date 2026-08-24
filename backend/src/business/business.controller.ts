import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { BusinessService } from './business.service'
import { BasketItemInput, CookingInput, IngredientCategoryInput, IngredientMappingInput, InventoryInput, MenuInput, OrderInput, OrderStatusInput, PurchaseInput } from './dto'

@Controller()
export class BusinessController {
  constructor(private readonly service: BusinessService, private readonly auth: AuthService) {}
  private user(authorization?: string) { const id = this.auth.verifyToken(authorization); if (!id) throw new UnauthorizedException('请先登录'); return id }

  @Get('ingredient-categories') categories(@Headers('authorization') a?: string) { return this.service.categories(this.user(a)) }
  @Post('ingredient-categories') createCategory(@Body() body: IngredientCategoryInput, @Headers('authorization') a?: string) { return this.service.createCategory(this.user(a), body) }
  @Put('ingredient-categories/:id') updateCategory(@Param('id') id: string, @Body() body: IngredientCategoryInput, @Headers('authorization') a?: string) { return this.service.updateCategory(this.user(a), id, body) }
  @Delete('ingredient-categories/:id') deleteCategory(@Param('id') id: string, @Headers('authorization') a?: string) { return this.service.deleteCategory(this.user(a), id) }

  @Get('ingredient-mappings') mappings(@Headers('authorization') a?: string) { return this.service.mappings(this.user(a)) }
  @Put('ingredient-mappings/:sourceKey') saveMapping(@Param('sourceKey') sourceKey: string, @Body() body: IngredientMappingInput, @Headers('authorization') a?: string) { return this.service.saveMapping(this.user(a), decodeURIComponent(sourceKey), body) }
  @Delete('ingredient-mappings/:sourceKey') deleteMapping(@Param('sourceKey') sourceKey: string, @Headers('authorization') a?: string) { return this.service.deleteMapping(this.user(a), decodeURIComponent(sourceKey)) }

  @Get('inventory') inventory(@Headers('authorization') a?: string) { return this.service.inventory(this.user(a)) }
  @Post('inventory') createInventory(@Body() body: InventoryInput, @Headers('authorization') a?: string) { return this.service.createInventory(this.user(a), body) }
  @Put('inventory/:id') updateInventory(@Param('id') id: string, @Body() body: InventoryInput, @Headers('authorization') a?: string) { return this.service.updateInventory(this.user(a), id, body) }
  @Delete('inventory/:id') deleteInventory(@Param('id') id: string, @Headers('authorization') a?: string) { return this.service.deleteInventory(this.user(a), id) }

  @Get('basket') basket(@Headers('authorization') a?: string) { return this.service.basket(this.user(a)) }
  @Post('basket/items') addBasket(@Body() body: BasketItemInput, @Headers('authorization') a?: string) { return this.service.addBasket(this.user(a), body) }
  @Delete('basket/items/:id') deleteBasket(@Param('id') id: string, @Headers('authorization') a?: string) { return this.service.deleteBasketItem(this.user(a), id) }
  @Delete('basket/recipes/:recipeId') deleteBasketRecipe(@Param('recipeId') recipeId: string, @Headers('authorization') a?: string) { return this.service.deleteBasketRecipe(this.user(a), recipeId) }
  @Post('basket/purchase') purchase(@Body() body: PurchaseInput, @Headers('authorization') a?: string) { return this.service.purchase(this.user(a), body) }

  @Get('menu') menu(@Query('date') date: string | undefined, @Headers('authorization') a?: string) { return this.service.menu(this.user(a), date) }
  @Post('menu') addMenu(@Body() body: MenuInput, @Headers('authorization') a?: string) { return this.service.addMenu(this.user(a), body) }
  @Delete('menu/:id') deleteMenu(@Param('id') id: string, @Headers('authorization') a?: string) { return this.service.deleteMenu(this.user(a), id) }

  @Get('social/following') following(@Headers('authorization') a?: string) { return this.service.following(this.user(a)) }
  @Post('social/following/:userId') follow(@Param('userId') id: string, @Headers('authorization') a?: string) { return this.service.follow(this.user(a), id) }
  @Delete('social/following/:userId') unfollow(@Param('userId') id: string, @Headers('authorization') a?: string) { return this.service.unfollow(this.user(a), id) }
  @Get('recipes/collections') collections(@Headers('authorization') a?: string) { return this.service.collections(this.user(a)) }
  @Post('recipes/collections/:recipeId') collect(@Param('recipeId') id: string, @Headers('authorization') a?: string) { return this.service.collect(this.user(a), id) }
  @Delete('recipes/collections/:recipeId') uncollect(@Param('recipeId') id: string, @Headers('authorization') a?: string) { return this.service.uncollect(this.user(a), id) }

  @Get('orders') orders(@Query('date') date: string | undefined, @Headers('authorization') a?: string) { return this.service.orders(this.user(a), date) }
  @Post('orders') createOrder(@Body() body: OrderInput, @Headers('authorization') a?: string) { return this.service.createOrder(this.user(a), body) }
  @Put('orders/:id/status') updateOrder(@Param('id') id: string, @Body() body: OrderStatusInput, @Headers('authorization') a?: string) { return this.service.updateOrder(this.user(a), id, body.status) }
  @Get('cooking-records') cooking(@Headers('authorization') a?: string) { return this.service.cookingRecords(this.user(a)) }
  @Post('cooking-records') createCooking(@Body() body: CookingInput, @Headers('authorization') a?: string) { return this.service.createCookingRecord(this.user(a), body) }
}
