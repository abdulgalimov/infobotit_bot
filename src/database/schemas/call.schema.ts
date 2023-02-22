import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CallStatus, CallType, ICall } from '../../types';

@Schema({
  timestamps: true,
  versionKey: 'version',
  collection: 'calls',
})
export class CallDB implements ICall {
  @Prop({ unique: true })
  id: number;

  @Prop()
  entityId: number;

  @Prop()
  phone: string;

  @Prop({ type: String })
  type: CallType;

  @Prop({ type: String })
  status: CallStatus;

  @Prop({ unique: true })
  callId: string;

  @Prop()
  timeStart: Date;

  @Prop()
  callDuration: number;

  @Prop()
  talkDuration: number;

  @Prop()
  recording: string;

  @Prop()
  version: number;
}

export type CallDocumentDB = HydratedDocument<CallDB>;
export const CallSchemaDB = SchemaFactory.createForClass(CallDB);

CallSchemaDB.index(
  {
    createdAt: 1,
    phone: 1,
    entityId: 1,
    status: 1,
  },
  { name: 'last_calls' },
);
