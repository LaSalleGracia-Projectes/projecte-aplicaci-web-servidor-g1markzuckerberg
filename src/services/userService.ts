import { findOne, findById, create } from './databaseService.js';
import User from '../models/User.js';
import type UserI from '../types/UserI.js';
import type mongoose from 'mongoose';

const getUserService = async (credentials: UserI) => {
  const user = await findOne(User, credentials, {});
  return user;
}

const getUserByIdService = async (id: string) => {
  const user = await findById(User, id, {});
  return user;
}

const createUserService = async (user: UserI) => {
  const userParsed = new User(user);
  const userCreated = await create(userParsed);
  return userCreated;
}

interface UpdateUserOptions {
  regularUpdate?: Partial<UserI>;
  mongoUpdate?: mongoose.UpdateQuery<UserI>;
}

const updateUserService = async (userId: string, options: UpdateUserOptions) => {
  const { regularUpdate, mongoUpdate } = options;
  const updateData = { ...regularUpdate, ...mongoUpdate };
  const userUpdated = await User.findByIdAndUpdate(userId, updateData, { new: true });
  console.log('updated', userUpdated);
  return userUpdated;
}


export { getUserService, getUserByIdService, createUserService, updateUserService };