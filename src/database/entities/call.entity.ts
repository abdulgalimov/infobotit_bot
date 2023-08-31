import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { CallStatus, CallType } from '../../types';
import { ICall } from '../../types/interfaces/call';

@Entity({ name: 'calls' })
export class CallEntity implements ICall {
  @PrimaryColumn()
  callId: string;

  @Column()
  orgId: number;

  @Column()
  customerId: number;

  @Column()
  type: CallType;

  @Column()
  status: CallStatus;

  @Column({ default: null })
  @Index()
  finishedAt: Date;

  @Column()
  createdAt: Date;
}
