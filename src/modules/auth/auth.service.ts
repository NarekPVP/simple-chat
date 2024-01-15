import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignUpDto } from './dto/sign-up.dto';

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
}
