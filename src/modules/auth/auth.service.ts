import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignUpDto } from './dto/sign-up.dto';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly userService: UserService) {}

  async signup(signUpDto: SignUpDto, res: Response) {
    try {
      const { password, ...userInfo } = signUpDto;
      let hashedPassword;

      try {
        hashedPassword = await bcrypt.hash(
          password,
          parseInt(process.env.SALT_ROUNDS) || 10,
        );
      } catch (error) {
        throw new HttpException(
          'Error hashing password',
          HttpStatus.BAD_REQUEST,
        );
      }

      const newUser = await this.userService.create({
        ...userInfo,
        hashedPassword,
      });

      const { id, email } = newUser;

      const accessToken = await this.generateAccessToken(id, email);
      const refreshToken = await this.generateRefreshToken(id, email);

      await this.userService.update(id, { refreshToken });

      const oneDay = 24 * 60 * 60 * 1000;
      res.cookie('jwt', refreshToken, {
        httpOnly: true,
        maxAge: oneDay,
      });

      return res.json({ accessToken, newUser });
    } catch (error) {
      this.logger.error('An error occurred during signup.', error);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred during signup. Please try again later.',
      });
    }
  }

  private async generateAccessToken(id: string, email: string) {
    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
    const accessToken = jwt.sign({ id, email }, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });
    return accessToken;
  }

  private async generateRefreshToken(id: string, email: string) {
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
    const refreshToken = jwt.sign({ id, email }, REFRESH_TOKEN_SECRET, {
      expiresIn: '1d',
    });
    return refreshToken;
  }
}
