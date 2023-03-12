import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column()
  name: string;

  @Column()
  isAdmin: boolean;

  @Column()
  createdAt: Date;
}
