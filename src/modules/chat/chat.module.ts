import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RoomService } from './services/room.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { UserModule } from '../user/user.module';
import { ConnectedUserService } from './services/connected-user.service';
import { ConnectedUser } from './entities/connected-user.entity';

@Module({
  providers: [ChatGateway, RoomService, ConnectedUserService],
  imports: [TypeOrmModule.forFeature([Room, ConnectedUser]), UserModule],
})
export class ChatModule {}
