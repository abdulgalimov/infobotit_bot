import { CallType } from '../constants';

export interface ICall {
  id: number;
  entityId: number;
  phone: string;
  type: CallType;
  callId: string;
  timeStart: Date;
  callDuration: number;
  talkDuration: number;
  recording: string;
}
