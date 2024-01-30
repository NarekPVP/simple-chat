import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Entity,
  Column,
  Unique,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';

@Entity({ name: 'room' })
@Unique(['name'])
export class Room extends BaseEntity {
  @Column({ nullable: true })
  name: string;

  @Column()
  type: string;

  @ManyToMany(() => User)
  @JoinTable()
  participants: User[];

  @Column()
  createdBy: string;

  @Column()
  updatedBy: string;

  @OneToMany(() => Message, (message) => message.room)
  messages: Message[];
}
