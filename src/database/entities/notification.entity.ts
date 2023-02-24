import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  orgId: number;

  @Column({ type: 'bigint' })
  chatId: number;

  @Column()
  messageId: number;
}
