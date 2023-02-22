import { Request } from 'express';
import { IUser } from './user';

declare module 'express' {
  interface Request {
    user: IUser;
  }
}

export type InputRequest = Request;
