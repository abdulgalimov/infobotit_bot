import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CallStatus, CallType, ICall } from '../../types';

@Entity({ name: 'cdrs' })
export class CdrEntity implements ICall {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityId: number;

  @Column()
  phone: string;

  @Column()
  type: CallType;

  @Column()
  status: CallStatus;

  @Column()
  callId: string;

  @Column()
  timeStart: Date;

  @Column()
  callDuration: number;

  @Column()
  talkDuration: number;

  @Column()
  recording: string;

  @Column()
  createdAt: Date;
}
