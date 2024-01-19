import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { CreateRoomDto } from '../dtos/room/create-room.dto';
import { UpdateRoomDto } from '../dtos/room/update-room.dto';
import { User } from 'src/modules/user/entities/user.entity';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async create(
    userId: string,
    createRoomDto: CreateRoomDto,
    participants: User[],
  ): Promise<Room> {
    const newRoom = this.roomRepository.create({
      ...createRoomDto,
      createdBy: userId,
      updatedBy: userId,
      participants,
    });
    return this.roomRepository.save(newRoom);
  }

  async findAll(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }
    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.roomRepository.preload({
      id: id,
      ...updateRoomDto,
    });
    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }
    return this.roomRepository.save(room);
  }

  async delete(id: string): Promise<void> {
    const result = await this.roomRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }
  }
}
