import { Room } from 'src/modules/chat/entities/room.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, ManyToMany, OneToMany, Unique } from 'typeorm';
import { ConnectedUser } from 'src/modules/chat/entities/connected-user.entity';

@Entity({ name: 'user' })
@Unique(['email'])
export class User extends BaseEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  hashedPassword: string;

  @Column({ nullable: true })
  refreshToken: string;

  @ManyToMany(() => Room, (room) => room.participants)
  rooms: Room[];

  @OneToMany(() => ConnectedUser, (connectedUser) => connectedUser.user)
  connectedUsers: ConnectedUser[];
}
