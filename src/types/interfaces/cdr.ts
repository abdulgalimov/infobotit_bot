import { CallStatus, CallType } from '../constants';

export interface ICdr {
  id: number;
  orgId: number;
  phone: string;
  type: CallType;
  status: CallStatus;
  callId: string;
  timeStart: Date;
  callDuration: number;
  talkDuration: number;
  recording: string;
}
