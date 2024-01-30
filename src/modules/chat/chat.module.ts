import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RoomService } from './services/room.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { UserModule } from '../user/user.module';
import { ConnectedUserService } from './services/connected-user.service';
import { ConnectedUser } from './entities/connected-user.entity';
import { MessageService } from './services/message.service';
import { Message } from './entities/message.entity';

@Module({
  providers: [ChatGateway, RoomService, ConnectedUserService, MessageService],
  imports: [
    TypeOrmModule.forFeature([Room, ConnectedUser, Message]),
    UserModule,
  ],
})
export class ChatModule {}
