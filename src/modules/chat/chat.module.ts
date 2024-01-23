import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RoomService } from './services/room.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { UserModule } from '../user/user.module';
import { ConnectedUserService } from './services/connected-user.service';

@Module({
  providers: [ChatGateway, RoomService, ConnectedUserService],
  imports: [TypeOrmModule.forFeature([Room]), UserModule],
})
export class ChatModule {}
