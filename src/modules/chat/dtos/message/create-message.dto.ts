import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  text: string;
}
