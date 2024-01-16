import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignUpDto } from './dto/sign-up.dto';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../configs/jwt.config';
@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async signup(signUpDto: SignUpDto) {
    const { password, ...userInfo } = signUpDto;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await this.userService.create({
      ...userInfo,
      hashedPassword,
    });

    // return this.login(newUser);
  }

  private async generateAccessToken(id: string, email: string) {
    const { ACCESS_TOKEN_SECRET } = JWT_CONFIG;
    const accessToken = jwt.sign({ id, email }, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });
    return accessToken;
  }

  private async generateRefreshToken(id: string, email: string) {
    const { REFRESH_TOKEN_SECRET } = JWT_CONFIG;
    const refreshToken = jwt.sign({ id, email }, REFRESH_TOKEN_SECRET, {
      expiresIn: '1d',
    });
    return refreshToken;
  }
}
