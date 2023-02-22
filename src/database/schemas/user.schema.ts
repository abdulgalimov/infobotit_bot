import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IUser } from '../../types';

@Schema({
  timestamps: true,
  versionKey: 'version',
  collection: 'users',
})
export class UserDB implements IUser {
  @Prop({ unique: true })
  id: number;

  @Prop()
  name: string;

  @Prop()
  isAdmin: boolean;

  @Prop()
  version: number;
}

export type UserDocumentDB = HydratedDocument<UserDB>;
export const UserSchemaDB = SchemaFactory.createForClass(UserDB);
