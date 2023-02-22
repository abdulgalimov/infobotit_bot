import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IChat, IEntity } from '../../types';

@Schema({
  timestamps: true,
  versionKey: 'version',
  collection: 'entities',
})
export class EntityDB implements IEntity {
  @Prop({ unique: true })
  id: number;

  @Prop({ unique: true })
  title: string;

  @Prop({ type: Object })
  chat: IChat;

  @Prop()
  version: number;
}

export type EntityDocumentDB = HydratedDocument<EntityDB>;
export const EntitySchemaDB = SchemaFactory.createForClass(EntityDB);

EntitySchemaDB.index(
  {
    'chat.id': 1,
  },
  {
    name: 'by_chat_id',
    sparse: true,
  },
);
