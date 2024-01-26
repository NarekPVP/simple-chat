import { Logger, UnauthorizedException, UseFilters } from '@nestjs/common';
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
import { plainToInstance } from 'class-transformer';
import { User } from '../user/entities/user.entity';

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

      await this.connectedUserService.create(decoded.id, socket.id);
      const rooms = await this.roomService.findByUserId(decoded.id);
      this.server.to(socket.id).emit('userAllRooms', rooms);

      this.logger.log(
        `Client connected: ${socket.id} - User ID: ${decoded.id}`,
      );
    } catch (e) {
      this.handleConnectionError(socket, e);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${socket.id}`);
    this.connectedUserService.delete(socket.id);
  }

  @SubscribeMessage('createRoom')
  async onCreateRoom(
    @WsCurrentUser() user: UserPayload,
    @MessageBody() createRoomDto: CreateRoomDto,
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
            `You cannot create a room without at least one participant`,
          );
        }

        if (type === RoomTypeEnum.DIRECT && participantsIds.length !== 1) {
          throw new WsException(`Direct chat can have only 2 members`);
        }

        participantsIds.push(user.id);
        const participants = await this.fetchParticipants(participantsIds);

        const newRoom = await this.roomService.create(
          userId,
          validatedDto,
          participants,
        );

        const createdRoom = await this.roomService.findOne(newRoom.id);

        try {
          for (const { connectedUsers } of createdRoom.participants) {
            for (const { socketId } of connectedUsers) {
              this.server.to(socketId).emit('roomCreated', newRoom);
              this.logger.log(
                `Room created event emitted to socket ID: ${socketId}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to emit roomCreated event: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }

  private async fetchParticipants(participantsIds: string[]): Promise<User[]> {
    const participants: User[] = [];

    for (const participantsId of participantsIds) {
      try {
        const userResponseDto = await this.userService.findOne(participantsId);
        const user = plainToInstance(User, userResponseDto);
        participants.push(user);
      } catch (ex) {
        throw new WsException(`User with ID '${participantsId}' not found`);
      }
    }

    return participants;
  }

  private handleConnectionError(socket: Socket, error: Error): void {
    this.logger.error(`Authentication error: ${error.message}`);
    socket.emit('exception', 'Authentication error');
    socket.disconnect();
  }

  private extractJwtToken(socket: Socket): string {
    const authHeader = socket.handshake.headers.authorization;
    if (!authHeader) throw new UnauthorizedException('No authorization header');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid token format');
    return token;
  }
}
