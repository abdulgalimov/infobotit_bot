export enum CallStatus {
  ALERT = 'ALERT',
  TALK = 'TALK',
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO ANSWER',
  BUSY = 'BUSY',
}

export enum FinishStatus {
  NO_ANSWER = 'noAnswer',
  USER_CALL = 'userCall',
  USER_ANSWER = 'userAnswer',
}

export enum CallType {
  Inbound = 'Inbound',
  Outbound = 'Outbound',
}
