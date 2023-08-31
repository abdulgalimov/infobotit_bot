import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'notifications' })
@Index(['phone', 'chatId'])
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
