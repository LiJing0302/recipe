import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class AccountCredentialsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^\S+$/, { message: '账号不能包含空格' })
  account!: string

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string
}
