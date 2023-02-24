import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { CallStatus, CallType } from '../../types';

@Entity({ name: 'stats' })
export class StatEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column()
  entityId: number;

  @Column({ type: 'enum', enum: CallType })
  callType: CallType;

  @Column({ type: 'enum', enum: CallStatus })
  callStatus: CallStatus;

  @Column()
  talkDuration: number;

  @Column()
  waitDuration: number;

  @Column()
  createdAt: Date;
}
