import { CallStatus, CallType } from '../constants';

export interface ICall {
  id: number;
  entityId: number;
  phone: string;
  type: CallType;
  status: CallStatus;
  callId: string;
  timeStart: Date;
  callDuration: number;
  talkDuration: number;
  recording: string;
}
