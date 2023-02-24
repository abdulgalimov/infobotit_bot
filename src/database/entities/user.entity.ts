import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  isAdmin: boolean;

  @Column()
  createdAt: Date;
}
