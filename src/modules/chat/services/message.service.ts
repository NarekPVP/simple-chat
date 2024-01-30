import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { CreateMessageDto } from '../dtos/message/create-message.dto';
import { WsException } from '@nestjs/websockets';
import { FilterMessageDto } from '../dtos/message/filter-message.dto';
import { TResultAndCount } from 'src/types/result-and-count.type';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
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
    filterMessageDto: FilterMessageDto,
  ): Promise<TResultAndCount<Message>> {
    const { first = 0, rows = 20, filter = '', roomId } = filterMessageDto;
    this.logger.log(
      `Retrieving messages for room ID ${roomId} with filter '${filter}' and pagination first: ${first}, rows: ${rows}`,
    );

    try {
      const [result, total] = await this.messageRepository.findAndCount({
        where: { text: ILike(`%${filter}%`), roomId },
        relations: ['creator'],
        order: { createdAt: 'DESC' },
        take: rows,
        skip: first,
      });

      this.logger.log(
        `Retrieved ${result.length} messages for room ID ${roomId}`,
      );
      return { result, total };
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
