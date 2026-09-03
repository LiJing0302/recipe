import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { CreateAiResponseDto } from './dto'
import { AiService } from './ai.service'

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService, private readonly authService: AuthService) {}

  @Post('responses')
  createResponse(@Body() input: CreateAiResponseDto, @Headers('authorization') authorization?: string) {
    return this.aiService.createResponse(input, this.requireUser(authorization))
  }

  private requireUser(authorization?: string) {
    const userId = this.authService.verifyToken(authorization)
    if (!userId) throw new UnauthorizedException('请先登录')
    return userId
  }
}
