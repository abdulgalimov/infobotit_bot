import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CallStatus, CallType } from '../../types';

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  entityId: number;

  @Column({ type: 'bigint' })
  chatId: number;

  @Column()
  messageId: number;
}
