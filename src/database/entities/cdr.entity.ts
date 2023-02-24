import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CallStatus, CallType } from '../../types';

@Entity({ name: 'cdrs' })
export class CdrEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orgId: number;

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
