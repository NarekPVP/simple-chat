import { Room } from 'src/modules/chat/entities/room.entity';
import { BaseEntity } from 'src/shared/entities/base.entity';
import { Column, Entity, ManyToMany, Unique } from 'typeorm';

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
}
