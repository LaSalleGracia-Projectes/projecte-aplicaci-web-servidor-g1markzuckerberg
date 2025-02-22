import { sql } from './supabaseService.js';
import type UserI from '../types/UserI.js';
import { userTable } from '../models/User.js';

/**
 * 🔹 Buscar usuario por correo
 */
const getUserService = async (credentials: Partial<UserI>) => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, password, is_admin, created_at
      FROM ${sql(userTable)}
      WHERE correo = ${credentials.correo!}
      LIMIT 1
    `;
    return user ?? null;
  } catch (error) {
    console.error(`❌ Error fetching user by email:`, error);
    throw new Error(`Database error while fetching user`);
  }
};

/**
 * 🔹 Buscar usuario por ID
 */
const getUserByIdService = async (id: string) => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, password, is_admin, created_at
      FROM ${sql(userTable)}
      WHERE id = ${id}
      LIMIT 1
    `;
    return user ?? null;
  } catch (error) {
    console.error(`❌ Error fetching user by ID:`, error);
    throw new Error(`Database error while fetching user`);
  }
};

/**
 * 🔹 Crear un usuario en Supabase
 */
const createUserService = async (user: UserI) => {
  try {
    const [newUser] = await sql<UserI[]>`
      INSERT INTO ${sql(userTable)} (username, password, correo, is_admin)
      VALUES (${user.username ?? null}, ${user.password ?? null}, ${user.correo}, ${user.is_admin ?? false})
      RETURNING id, username, correo, is_admin, created_at
    `;
    return newUser ?? null;
  } catch (error) {
    console.error(`❌ Error creating user:`, error);
    throw new Error(`Database error while creating user`);
  }
};


const findUserByEmail = async (correo: string): Promise<UserI | undefined> => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, password, is_admin, created_at
      FROM ${sql(userTable)}
      WHERE correo = ${correo}
      LIMIT 1
    `;
    return user ?? null;
  } catch (error) {
    console.error(`❌ Error fetching user by email:`, error);
    throw new Error(`Database error while fetching user`);
  }
};

const deleteUserByEmail = async (correo: string): Promise<boolean> => {
  try {
    const result = await sql`
      DELETE FROM ${sql(userTable)}
      WHERE correo = ${correo}
      RETURNING id;
    `;

    return result.length > 0;  // Retorna `true` si se eliminó una fila
  } catch (error) {
    console.error(`❌ Error deleting user from database:`, error);
    return false;
  }
};

const updateUserTokens = async (id: number, tokens: Partial<UserI>): Promise<boolean> => {
  try {
    console.log('Updating tokens for user:', id, tokens);
    const result = await sql`
      UPDATE ${sql(userTable)}
      SET 
        "webToken" = ${tokens.webToken ?? null},
        "mobileToken" = ${tokens.mobileToken ?? null},
        "refreshWebToken" = ${tokens.refreshWebToken ?? null}
      WHERE id = ${id}
      RETURNING id;
    `;

    console.log('Update result:', result);
    return result.length > 0;  // Devuelve true si se actualizó al menos una fila
  } catch (error) {
    console.error(`❌ Error updating user tokens:`, error);
    throw new Error('Database update failed');
  }
};

export { getUserService, getUserByIdService, createUserService, findUserByEmail, deleteUserByEmail, updateUserTokens };
