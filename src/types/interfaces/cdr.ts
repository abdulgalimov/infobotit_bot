import { CallStatus, CallType } from '../constants';

export interface ICdr {
  id: number;
  orgId: number;
  customerId: number;
  type: CallType;
  status: CallStatus;
  callId: string;
  timeStart: Date;
  waitDuration: number;
  talkDuration: number;
  recording: string;
  telegramFileId: string;
  callto1: string;
  callto2: string;
  reserveMobile: string | null;
}
