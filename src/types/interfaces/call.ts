import { CallStatus, CallType } from '../constants';

export interface ICall {
  orgId: number;
  customerId: number;
  type: CallType;
  status: CallStatus;
  callId: string;
  createdAt: Date;
}
