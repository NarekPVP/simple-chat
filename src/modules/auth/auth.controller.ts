import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'User Sign-Up' })
  @ApiBody({ type: SignUpDto, description: 'User Sign-Up Data' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'User successfully signed up. Refresh token set in httpOnly cookie.',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid data.' })
  async signUp(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    return await this.authService.signUp(signUpDto, res);
  }

  @Post('sign-in')
  @ApiOperation({ summary: 'User Sign-In' })
  @ApiBody({ type: SignInDto, description: 'User Sign-In Data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully signed in. Access token generated.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials.',
  })
  async signIn(@Body() signInDto: SignInDto, @Res() res: Response) {
    return await this.authService.signIn(signInDto, res);
  }
}
