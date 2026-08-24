import { Body, Controller, Get, Headers, Post } from '@nestjs/common'
import { AccountCredentialsDto } from './dto'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() input: AccountCredentialsDto) {
    return this.authService.register(input)
  }

  @Post('login')
  login(@Body() input: AccountCredentialsDto) {
    return this.authService.login(input)
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.currentUser(authorization)
  }
}
