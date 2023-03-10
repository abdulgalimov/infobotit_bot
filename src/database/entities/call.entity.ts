import { Entity, Column, PrimaryColumn } from 'typeorm';
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
  finishedAt: Date;

  @Column()
  createdAt: Date;
}
