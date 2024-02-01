import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { CreateMessageDto } from '../dtos/message/create-message.dto';
import { WsException } from '@nestjs/websockets';
import { FilterMessageDto } from '../dtos/message/filter-message.dto';
import { TResultAndCount } from 'src/types/result-and-count.type';
import { MessageDto } from '../dtos/message/message.dto';
import { RoomService } from './room.service';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly roomService: RoomService,
  ) {}

  async createMessage(
    userId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    try {
      const newMessage = this.messageRepository.create({
        ...createMessageDto,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedMessage = await this.messageRepository.save(newMessage);
      this.logger.log(`Message created successfully by User ID: ${userId}`);
      return savedMessage;
    } catch (error) {
      this.logger.error(
        `Failed to create message by User ID: ${userId}. Error: ${error.message}`,
        error.stack,
      );
      throw new WsException(
        'An error occurred while creating the message. Please try again.',
      );
    }
  }

  async findByRoomId(
    userId: string,
    filterMessageDto: FilterMessageDto,
  ): Promise<TResultAndCount<MessageDto>> {
    const { first = 0, rows = 20, filter = '', roomId } = filterMessageDto;

    try {
      const room = await this.roomService.findOne(roomId);

      if (!room) {
        throw new NotFoundException(`Room with ID "${roomId}" not found`);
      }

      const isParticipant = room.participants.some(
        (participant) => participant.id === userId,
      );

      if (!isParticipant) {
        throw new WsException(
          `Access Denied: You are not a member of the specified room.`,
        );
      }

      const [result, total] = await this.messageRepository.findAndCount({
        where: { text: ILike(`%${filter}%`), roomId },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
        take: rows,
        skip: first,
      });

      const sanitizedMessages = result.map((message) => {
        const { creator } = message;
        const { hashedPassword, refreshToken, ...sanitizedCreator } = creator;
        return { ...message, creator: sanitizedCreator };
      });

      return { result: sanitizedMessages, total };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve messages for room ID ${roomId}: ${error.message}`,
        error.stack,
      );

      throw new WsException(
        'An error occurred while fetching messages. Please try again later.',
      );
    }
  }

  async findByRoomId2(
    filterMessageDto: FilterMessageDto,
  ): Promise<TResultAndCount<MessageDto>> {
    const { first = 0, rows = 20, filter = '', roomId } = filterMessageDto;

    try {
      const [result, total] = await this.messageRepository.findAndCount({
        where: { text: ILike(`%${filter}%`), roomId },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
        take: rows,
        skip: first,
      });

      const sanitizedMessages = result.map((message) => {
        const { creator } = message;
        const { hashedPassword, refreshToken, ...sanitizedCreator } = creator;
        return { ...message, creator: sanitizedCreator };
      });

      return { result: sanitizedMessages, total };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve messages for room ID ${roomId}: ${error.message}`,
        error.stack,
      );
      throw new WsException(
        'An error occurred while fetching messages. Please try again later.',
      );
    }
  }
}
