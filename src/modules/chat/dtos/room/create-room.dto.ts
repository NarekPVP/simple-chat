import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RoomTypeEnum } from '../../enums/room-type.enum';

export class CreateRoomDto {
  @ApiProperty({ required: true })
  @IsEnum(RoomTypeEnum)
  @Transform(({ value }) => value.toString())
  @IsNotEmpty()
  type: RoomTypeEnum;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: true })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  participants: string[];
}
