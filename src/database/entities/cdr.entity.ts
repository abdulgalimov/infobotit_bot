import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CallStatus, CallType, ICdr, FinishStatus } from '../../types';

@Entity({ name: 'cdrs' })
export class CdrEntity implements ICdr {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  secret: number;

  @Column()
  orgId: number;

  @Column()
  customerId: number;

  @Column()
  type: CallType;

  @Column()
  status: CallStatus;

  @Column({
    type: String,
    default: FinishStatus.NO_ANSWER,
  })
  finishStatus: FinishStatus;

  @Column({
    nullable: true,
    default: null,
  })
  finishedAt: Date;

  @Column()
  callId: string;

  @Column()
  timeStart: Date;

  @Column()
  waitDuration: number;

  @Column()
  talkDuration: number;

  @Column()
  recording: string;

  @Column()
  createdAt: Date;

  @Column({ default: '' })
  telegramFileId: string;
}
