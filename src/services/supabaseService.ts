import postgres from 'postgres';
import type UserI from '../types/UserI.js';
import { userTable } from '../models/User.js';

const sql = postgres(process.env.DATABASE_URL ?? '', { prepare: false });

// 🔹 Buscar usuario por correo
const findUserByEmail = async (correo: string): Promise<UserI | undefined> => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, is_admin, created_at
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

// 🔹 Buscar usuario por ID
const findUserById = async (id: string): Promise<UserI | undefined> => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, is_admin, created_at
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

// 🔹 Crear un usuario en Supabase
const createUser = async (user: UserI): Promise<UserI | undefined> => {
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

export { findUserByEmail, findUserById, createUser};
