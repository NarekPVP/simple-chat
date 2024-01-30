import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { CreateRoomDto } from '../dtos/room/create-room.dto';
import { UpdateRoomDto } from '../dtos/room/update-room.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { WsException } from '@nestjs/websockets';
import { sanitizeUser } from 'src/common/helpers/sanitize-user';

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
      room.participants = room.participants.map(
        (participant) => sanitizeUser(participant) as User,
      );
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

  async update(
    userId: string,
    roomId: string,
    updateRoomData: UpdateRoomDto,
    participants: User[],
  ): Promise<Room> {
    try {
      const roomToUpdate = await this.roomRepository.preload({
        id: roomId,
        ...updateRoomData,
        participants,
        updatedBy: userId,
        updatedAt: new Date(),
      });

      if (!roomToUpdate) {
        this.logger.warn(
          `Attempted to update a non-existent room with ID: ${roomId}`,
        );
        throw new WsException(`Room with ID "${roomId}" not found.`);
      }

      const updatedRoom = await this.roomRepository.save(roomToUpdate);

      this.logger.log(`Room with ID ${roomId} updated successfully.`);
      return updatedRoom;
    } catch (error) {
      this.logger.error(
        `Failed to update room with ID ${roomId}: ${error.message}`,
        error.stack,
      );
      throw new WsException(
        'An error occurred while updating the room. Please try again.',
      );
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      const deletionResult = await this.roomRepository.delete(roomId);

      if (deletionResult.affected === 0) {
        throw new WsException(
          `Deletion failed: Room with ID "${roomId}" could not be found.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete room with ID ${roomId}: ${error.message}`,
        error.stack,
      );
      throw new WsException(
        'An error occurred while attempting to delete the room. Please try again.',
      );
    }
  }
}
