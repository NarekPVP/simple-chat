import { Logger, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { CreateRoomDto } from './dtos/room/create-room.dto';
import { JwtService } from '@nestjs/jwt';
import { WsCurrentUser } from 'src/common/decorators/ws-current-user.decorator';
import { UserPayload } from 'src/types/user-payload.type';
import { RoomService } from './services/room.service';
import { UserService } from '../user/user.service';
import { BaseGateway } from 'src/common/websockets/base.gateway';
import { WsExceptionFilter } from 'src/common/filters/ws-exception.filter';
import { RoomTypeEnum } from './enums/room-type.enum';
import { ConnectedUserService } from './services/connected-user.service';

@UseFilters(WsExceptionFilter)
@WebSocketGateway(4800, { cors: { origin: '*' } })
export class ChatGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly roomService: RoomService,
    private readonly connectedUserService: ConnectedUserService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Chat module initialized');
    await this.connectedUserService.deleteAll();
  }

  async handleConnection(socket: Socket) {
    try {
      const token = this.extractJwtToken(socket);
      const decoded: UserPayload = this.jwtService.verify(token, {
        secret: process.env.ACCESS_TOKEN_SECRET,
      });

      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
      } as UserPayload;

      const connectedUser = await this.connectedUserService.create(
        decoded.id,
        socket.id,
      );

      this.logger.log(
        `Client connected: ${socket.id} - User ID: ${decoded.id}`,
      );
    } catch (e) {
      this.logger.error(`Authentication error: ${e.message}`);
      socket.emit('error', 'Authentication error');
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('createRoom')
  async onCreateRoom(
    @WsCurrentUser() user: UserPayload,
    @MessageBody() createRoomDto: CreateRoomDto,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    await this.handleEvent(
      CreateRoomDto,
      createRoomDto,
      async (validatedDto) => {
        const { id: userId } = user;
        const { name, type, participants: participantsIds } = validatedDto;

        if (!name && type === RoomTypeEnum.GROUP) {
          throw new WsException(`Group chat name is required`);
        }

        if (!participantsIds?.length) {
          throw new WsException(
            `You cannot create room without least one participant`,
          );
        }

        if (type === RoomTypeEnum.DIRECT && participantsIds.length !== 1) {
          throw new WsException(`Direct chat can have only 2 member`);
        }

        const participants = [];

        for (const participantsId of participantsIds) {
          const user = await this.userService.findOne(participantsId);
          participants.push(user);
        }

        const newRoom = await this.roomService.create(
          userId,
          validatedDto,
          participants,
        );
        this.server.to(socket.id).emit('roomCreated', newRoom);
      },
    );
  }

  private extractJwtToken(socket: Socket): string {
    const authHeader = socket.handshake.headers.authorization;
    if (!authHeader) throw new Error('No authorization header');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) throw new Error('Invalid token format');
    return token;
  }
}
