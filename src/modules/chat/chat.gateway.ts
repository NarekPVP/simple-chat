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
import { UpdateRoomDto } from './dtos/room/update-room.dto';
import { DeleteRoomDto } from './dtos/room/delete-room.dto';
import { CreateMessageDto } from './dtos/message/create-message.dto';
import { MessageService } from './services/message.service';

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
    private readonly messageService: MessageService,
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

        if (
          participantsIds &&
          participantsIds.length &&
          !participantsIds.includes(userId)
        ) {
          participantsIds.push(userId);
        }

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

          throw new WsException(
            `Unable to notify all participants about the new room creation.`,
          );
        }
      },
    );
  }

  @SubscribeMessage('updateRoom')
  async onUpdateRoom(
    @WsCurrentUser() currentUser: UserPayload,
    @MessageBody() updateRoomDto: UpdateRoomDto,
  ) {
    await this.handleEvent(
      UpdateRoomDto,
      updateRoomDto,
      async (validatedDto) => {
        const { id: userId } = currentUser;
        const { roomId, participants: participantIds } = validatedDto;

        let participants: User[];

        if (
          participantIds &&
          participantIds.length &&
          !participantIds.includes(userId)
        ) {
          participantIds.push(userId);
        }

        participants =
          participantIds && participantIds.length
            ? await this.fetchParticipants(participantIds)
            : (await this.roomService.findOne(roomId)).participants;

        await this.roomService.update(
          userId,
          roomId,
          updateRoomDto,
          participants,
        );

        try {
          const updatedRoom = await this.roomService.findOne(roomId);

          for (const { connectedUsers } of updatedRoom.participants) {
            for (const { socketId } of connectedUsers) {
              this.server.to(socketId).emit('roomUpdated', updatedRoom);
              this.logger.log(
                `Room update notification sent to socket ID: ${socketId}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to notify participants about the room update for room ID ${roomId}: ${error.message}`,
            error.stack,
          );
          throw new WsException(
            `An error occurred while notifying participants of the room update. Please try again.`,
          );
        }
      },
    );
  }

  @SubscribeMessage('deleteRoom')
  async onDeleteRoom(
    @WsCurrentUser() currentUser: UserPayload,
    @MessageBody() deleteRoomDto: DeleteRoomDto,
  ): Promise<void> {
    await this.handleEvent(
      DeleteRoomDto,
      deleteRoomDto,
      async (validatedDto) => {
        const { id: userId } = currentUser;
        const { roomId } = validatedDto;
        const roomToDelete = await this.roomService.findOne(roomId);

        const isParticipant = roomToDelete.participants.some(
          (participant) => participant.id === userId,
        );

        if (!isParticipant) {
          throw new WsException(
            `Deletion failed: You are not authorized to delete this room.`,
          );
        }

        const connectedParticipants = roomToDelete.participants
          .filter((participant) => participant.connectedUsers.length)
          .flatMap((participant) => participant.connectedUsers);

        await this.roomService.deleteRoom(roomId);

        for (const { socketId } of connectedParticipants) {
          this.server
            .to(socketId)
            .emit(
              'roomDeleted',
              `Room with ID ${roomId} has been successfully deleted.`,
            );
        }
      },
    );
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(
    @WsCurrentUser() currentUser: UserPayload,
    @MessageBody() createMessageDto: CreateMessageDto,
  ): Promise<void> {
    const userId = currentUser.id;
    const { roomId } = createMessageDto;

    await this.messageService.createMessage(userId, createMessageDto);
    this.logger.log(
      `User ID ${userId} sent a new message in Room ID ${roomId}`,
    );

    const messages = await this.messageService.findByRoomId({ roomId });

    const room = await this.roomService.findOne(roomId);

    room.participants.forEach((participant) => {
      participant.connectedUsers.forEach(({ socketId }) => {
        this.server.to(socketId).emit('messageSent', messages);
        this.logger.log(
          `Notified User at Socket ID ${socketId} about a new message in Room ID ${roomId}`,
        );
      });
    });
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
