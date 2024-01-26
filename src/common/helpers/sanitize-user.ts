import { UserResponseDto } from 'src/modules/user/dtos/user-response.dto';
import { User } from 'src/modules/user/entities/user.entity';

export const sanitizeUser = (user: User): UserResponseDto => {
  const { hashedPassword, refreshToken, ...sanitizedUser } = user;
  return sanitizedUser;
};
