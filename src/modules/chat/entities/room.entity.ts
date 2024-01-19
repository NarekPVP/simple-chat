import { BaseEntity } from 'src/shared/entities/base.entity';
import { Entity, Column, Unique, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'room' })
@Unique(['name'])
export class Room extends BaseEntity {
  @Column()
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
}
