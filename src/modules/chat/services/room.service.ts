import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { CreateRoomDto } from '../dtos/room/create-room.dto';
import { UpdateRoomDto } from '../dtos/room/update-room.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async create(
    userId: string,
    createRoomDto: CreateRoomDto,
    participants: User[],
  ): Promise<Room> {
    try {
      const newRoom = this.roomRepository.create({
        ...createRoomDto,
        participants,
        createdBy: userId,
        updatedBy: userId,
      });
      return await this.roomRepository.save(newRoom);
    } catch (error) {
      this.logger.error(`Failed to create room: ${error.message}`, error.stack);
      throw new WsException('Error occurred while creating the room.');
    }
  }

  async findAll(): Promise<Room[]> {
    try {
      return await this.roomRepository.find({ relations: ['participants'] });
    } catch (error) {
      this.logger.error(
        `Failed to find all rooms: ${error.message}`,
        error.stack,
      );
      throw new WsException('Error occurred while retrieving rooms.');
    }
  }

  async findOne(id: string): Promise<Room> {
    try {
      const room = await this.roomRepository.findOne({
        where: { id },
        relations: ['participants', 'participants.connectedUsers'],
      });
      if (!room) {
        throw new WsException(`Room with ID "${id}" not found`);
      }
      return room;
    } catch (error) {
      this.logger.error(
        `Failed to find room with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new WsException('Error occurred while retrieving the room.');
    }
  }

  async findByUserId(userId: string): Promise<Room[]> {
    try {
      return await this.roomRepository
        .createQueryBuilder('room')
        .innerJoin('room.participants', 'user')
        .where('user.id = :userId', { userId })
        .getMany();
    } catch (error) {
      this.logger.error(
        `Failed to find rooms for user ID ${userId}: ${error.message}`,
        error.stack,
      );
      throw new WsException(
        'Error occurred while retrieving rooms for the user.',
      );
    }
  }

  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    try {
      const room = await this.roomRepository.preload({
        id,
        ...updateRoomDto,
      });
      if (!room) {
        throw new WsException(`Room with ID "${id}" not found`);
      }
      return await this.roomRepository.save(room);
    } catch (error) {
      this.logger.error(
        `Failed to update room with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new WsException('Error occurred while updating the room.');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.roomRepository.delete(id);
      if (result.affected === 0) {
        throw new WsException(`Room with ID "${id}" not found`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete room with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new WsException('Error occurred while deleting the room.');
    }
  }
}
