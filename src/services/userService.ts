import { findUserByEmail, findUserById, createUser } from './supabaseService.js';
import type UserI from '../types/UserI.js';

const getUserService = async (credentials: Partial<UserI>) => {
  const user = await findUserByEmail(credentials.correo!);
  return user;
};

const getUserByIdService = async (id: string) => {
  const user = await findUserById(id);
  return user;
};

const createUserService = async (user: UserI) => {
  const userCreated = await createUser(user);
  return userCreated;
};

export { getUserService, getUserByIdService, createUserService };
