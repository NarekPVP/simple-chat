import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway(4800, { cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor() {}

  async onModuleInit(): Promise<void> {
    console.log('chat initialized');
  }

  async handleConnection(socket: Socket): Promise<void> {}
  async handleDisconnect(socket: Socket): Promise<void> {}
}
