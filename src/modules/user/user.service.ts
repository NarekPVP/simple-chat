import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user.response.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const user = this.userRepository.create(createUserDto);
      return this.sanitizeUser(await this.userRepository.save(user));
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findOne(userId: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          id: userId,
        },
      });

      if (!user) {
        this.logger.warn(`User with ID "${userId}" not found`);
        throw new NotFoundException(`User with ID "${userId}" not found`);
      }

      return this.sanitizeUser(user);
    } catch (error) {
      this.logger.error(`Failed to find user: ${error.message}`, error.stack);

      throw new NotFoundException(`Failed to find user with ID "${userId}"`);
    }
  }

  async findUserByEmail(email: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          email,
        },
      });

      if (!user) {
        this.logger.warn(`User with email "${email}" not found`);
        throw new NotFoundException(`User with email "${email}" not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error('Failed to find user by email', error.stack);

      throw new InternalServerErrorException(
        'Failed to find user by email',
        error,
      );
    }
  }

  async update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.findOne(userId);

      if (!user) {
        this.logger.warn(`User with ID "${userId}" not found`);
        throw new NotFoundException(`User with ID "${userId}" not found`);
      }

      Object.assign(user, updateUserDto);
      return this.sanitizeUser(await this.userRepository.save(user));
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(
        `Failed to update user with ID "${userId}"`,
      );
    }
  }

  private sanitizeUser(user: User): UserResponseDto {
    const { hashedPassword, refreshToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
