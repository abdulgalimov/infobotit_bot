import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'orgs' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  chatId: number;
}
