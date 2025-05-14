import { CallStatus, CallType } from '../constants';

export interface ICall {
  orgId: number;
  customerId: number;
  type: CallType;
  status: CallStatus;
  finishedAt: Date;
  callId: string;
  createdAt: Date;
  reserveMobile: string | null;
}
