import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
