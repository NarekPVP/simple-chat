import { Column, Entity } from 'typeorm';

@Entity({ name: 'user' })
export class User {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  hashedPassword: string;
}
