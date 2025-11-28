import { Request } from 'express';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}