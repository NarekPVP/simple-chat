import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { WsException } from '@nestjs/websockets';
import { ConnectedUser } from '../entities/connected-user.entity';

@Injectable()
export class ConnectedUserService {
  constructor(
    @InjectRepository(ConnectedUser)
    private readonly connectedUserRepository: Repository<ConnectedUser>,
  ) {}

  async create(userId: string, socketId: string) {}

  async delete(socketId: string) {}

  async deleteAll(): Promise<void> {}
}
