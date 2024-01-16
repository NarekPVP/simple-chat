import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignUpDto } from './dto/sign-up.dto';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { SignInDto } from './dto/sign-in.dto';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly userService: UserService) {}

  async signUp(signUpDto: SignUpDto, res: Response) {
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

  async signIn(signInDto: SignInDto, res: Response) {
    const { email, password } = signInDto;
    try {
      const user = await this.userService.findUserByEmail(email);

      if (!user) {
        this.logger.warn(`Invalid email "${email}" or password`);
        throw new UnauthorizedException('Invalid email or password');
      }

      const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

      if (!passwordMatch) {
        this.logger.warn(`Invalid email "${email}" or password`);
        throw new UnauthorizedException('Invalid email or password');
      }

      const { id } = user;
      const accessToken = await this.generateAccessToken(id, email);
      const refreshToken = await this.generateRefreshToken(id, email);

      await this.userService.update(id, { refreshToken });

      res.cookie('jwt', refreshToken, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });

      const currentUser = await this.userService.findOne(user.id);
      return res.json({ accessToken, currentUser });
    } catch (error) {
      this.logger.error(`Sign-in failed: ${error.message}`, error.stack);
      res
        .status(401)
        .json({ message: 'Sign-in failed. Please try again later.' });
    }
  }

  async signOut(res: Response) {
    try {
      res.clearCookie('jwt');

      return res.status(HttpStatus.OK).json({ message: 'Sign-out successful' });
    } catch (error) {
      this.logger.error('An error occurred during sign-out.', error);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred during sign-out. Please try again later.',
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
