import { sql } from './supabaseService.js';
import type UserI from '../types/UserI.js';
import { userTable } from '../models/User.js';
import bcrypt from 'bcrypt';
import type Liga from '../types/Liga.js';
import { ligaTable } from '../models/Liga.js';
import { usuariosLigasTable } from '../models/LigaUsuario.js';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';


/**
 * Buscar usuario por correo
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
 * Buscar usuario por ID
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
 * Crear un usuario en Supabase
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

/**
 * 🔹 **Actualizar el nombre de usuario (username) del usuario autenticado**
 */
const updateUsernameService = async (id: number, newUsername: string) => {
  try {
    const result = await sql`
      UPDATE ${sql(userTable)}
      SET username = ${newUsername}
      WHERE id = ${id}
      RETURNING id, username, correo, is_admin, created_at, "birthDate";
    `;
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`❌ Error updating username:`, error);
    throw new Error(`Database error while updating username`);
  }
};

/**
 * 🔹 **Actualizar la fecha de nacimiento (birthDate) del usuario autenticado**
 */
const updateBirthDateService = async (id: number, newBirthDate: Date | string) => {
  try {
    // Convertir a Date si viene como string
    const dateObj = newBirthDate instanceof Date ? newBirthDate : new Date(newBirthDate);
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date format");
    }

    const formattedDate = dateObj.toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    const result = await sql`
      UPDATE ${sql(userTable)}
      SET "birthDate" = ${formattedDate}
      WHERE id = ${id}
      RETURNING id, username, correo, is_admin, created_at, "birthDate";
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`❌ Error updating birth date:`, error);
    throw new Error(`Database error while updating birth date`);
  }
};


/**
 * 🔹 **Actualizar la contraseña del usuario autenticado**
 */
const updatePasswordService = async (id: number, oldPassword: string, newPassword: string) => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT password FROM ${sql(userTable)}
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (!user?.password || !(await bcrypt.compare(oldPassword, user.password))) {
      throw new Error(`Invalid current password`);
    }

    // Opcional: hashear la nueva contraseña antes de actualizarla
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const result = await sql`
      UPDATE ${sql(userTable)}
      SET password = ${hashedNewPassword}
      WHERE id = ${id}
      RETURNING id;
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`❌ Error updating password:`, error);
    throw new Error(`Database error while updating password`);
  }
};

/**
 * 🔹 **Obtener todos los datos de un usuario por ID**
 */
const getUserByIdAdminService = async (adminId: number, userId: number) => {
  try {
    // Verificar si el usuario solicitante es admin
    const [admin] = await sql<UserI[]>`
      SELECT is_admin FROM ${sql(userTable)}
      WHERE id = ${adminId}
      LIMIT 1;
    `;
    if (!admin || !admin.is_admin) {
      throw new Error(`Unauthorized: Only admins can perform this action`);
    }

    // Obtener el usuario por ID, usando comillas dobles para "birthDate"
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, is_admin, created_at, "birthDate"
      FROM ${sql(userTable)}
      WHERE id = ${userId}
      LIMIT 1;
    `;

    return user ?? null;
  } catch (error) {
    console.error(`❌ Error fetching user by ID:`, error);
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      // Re-lanza el error sin cambiar el mensaje
      throw error;
    }
    
    throw new Error(`Database error while fetching user`);
  }
};

/**
 * 🔹 **Editar usuario como administrador (incluyendo rol)**
 */
const adminUpdateUserService = async (adminId: number, userId: number, updates: Partial<UserI>) => {
  try {
    // Verificar si el usuario solicitante es admin
    const [admin] = await sql<UserI[]>`
      SELECT is_admin FROM ${sql(userTable)}
      WHERE id = ${adminId}
      LIMIT 1;
    `;
    if (!admin || !admin.is_admin) {
      throw new Error(`Unauthorized: Only admins can perform this action`);
    }

    // Construir el objeto con solo los campos a actualizar
    const updateData: Record<string, any> = {};
    if (updates.username) updateData.username = updates.username;
    if (updates.birthDate) {
      // Si birthDate no es un objeto Date, lo convertimos
      let bd: Date;
      if (updates.birthDate instanceof Date) {
        bd = updates.birthDate;
      } else {
        bd = new Date(updates.birthDate);
      }
      // Convertir a "YYYY-MM-DD"

      updateData.birthDate = bd.toISOString().split('T')[0];
    }

    if (updates.is_admin !== undefined) updateData.is_admin = updates.is_admin;
    if (updates.password) updateData.password = updates.password;

    if (Object.keys(updateData).length === 0) return null; // No hay cambios

    const [updatedUser] = await sql<UserI[]>`
      UPDATE ${sql(userTable)}
      SET ${sql(updateData)}
      WHERE id = ${userId}
      RETURNING id, username, correo, is_admin, created_at, "birthDate";
    `;
    
    return updatedUser ?? null;
  } catch (error) {
    console.error(`❌ Error updating user as admin:`, error);
    throw new Error(`Database error while updating user`);
  }
};

/**
 * Obtener todas las ligas en las que está inscrito un usuario.
 * @param userId - ID del usuario.
 * @returns {Promise<Liga[]>} - Array de ligas.
 */
/**
 * Obtener todas las ligas en las que está inscrito un usuario,
 * incluyendo todos los datos de la liga y el campo `puntos_totales` de la tabla de relación.
 * @param userId - ID del usuario autenticado.
 * @returns {Promise<(Liga & { puntos_totales: number })[]>} - Array de ligas con puntos.
 */
const getLeaguesByUserService = async (userId: number): Promise<Array<Liga & { puntos_totales: number, total_users: number }>> => {
  try {
    const leagues = await sql<Array<Liga & { puntos_totales: number, total_users: number }>>`
      SELECT 
        l.id,
        l.name,
        l.jornada_id,
        l.created_by,
        l.created_jornada,
        l.code,
        ul.puntos_totales,
        (
          SELECT COUNT(*) 
          FROM ${sql(usuariosLigasTable)} ul2
          WHERE ul2.liga_id = l.id
        ) AS total_users
      FROM ${sql(ligaTable)} l
      JOIN ${sql(usuariosLigasTable)} ul ON l.id = ul.liga_id
      WHERE ul.usuario_id = ${userId}
      ORDER BY l.id;
    `;
    return leagues;
  } catch (error) {
    console.error('❌ Error fetching leagues for user:', error);
    throw new Error('Database error while fetching leagues for user');
  }
};

const generateValidPassword = (): string => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';

  const getRandom = (str: string) => str[Math.floor(Math.random() * str.length)];

  // Garantizar al menos uno de cada tipo
  const base = [getRandom(upper), getRandom(lower), getRandom(digits)];

  const allChars = upper + lower + digits;
  while (base.length < 10) {
    base.push(getRandom(allChars));
  }

  // Mezclar
  return base.sort(() => 0.5 - Math.random()).join('');
};

/**
 * Servicio para recuperar contraseña y enviarla por correo
 */
const forgotPasswordService = async (correo: string): Promise<string> => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id FROM ${sql(userTable)} WHERE correo = ${correo} LIMIT 1
    `;
    if (!user) throw new Error('User not found');

    const newPassword = generateValidPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE ${sql(userTable)} SET password = ${hashedPassword}
      WHERE id = ${user.id!}
    `;

    // Validar variables de entorno
    const fromEmail = process.env.EMAIL_USER;
    const fromPass = process.env.EMAIL_PASS;
    if (!fromEmail || !fromPass) {
      throw new Error('Faltan credenciales de email en el entorno');
    }

    const transporter: Transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: fromEmail,
        pass: fromPass
      }
    });

    await transporter.sendMail({
      from: `"FantasyDraft Soporte" <${fromEmail}>`,
      to: correo,
      subject: '🔐 Tu nueva contraseña temporal',
      html: `
        <h3>Hola 👋</h3>
        <p>Has solicitado recuperar tu contraseña.</p>
        <p><strong>Tu nueva contraseña temporal es:</strong></p>
        <pre style="font-size: 16px; background: #f0f0f0; padding: 8px; display: inline-block;">${newPassword}</pre>
        <p>Inicia sesión y cámbiala lo antes posible.</p>
      `
    });

    return newPassword;
  } catch (error) {
    console.error(`❌ Error en forgotPasswordService:`, error);
    throw new Error('No se pudo enviar la nueva contraseña');
  }
};

const updateGoogleIdService = async (id: number, googleId: string): Promise<boolean> => {
  try {
    const result = await sql`
      UPDATE ${sql(userTable)}
      SET google_id = ${googleId}
      WHERE id = ${id}
      RETURNING id;
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`❌ Error actualizando google_id:`, error);
    throw new Error(`Database error while updating google_id`);
  }
};

/**
 * Obtener todos los usuarios.
 * Nota: la paginación se manejará desde el frontend.
 */
const getAllUsersService = async (): Promise<UserI[]> => {
  try {
    const users = await sql<UserI[]>`
      SELECT id, username, correo, is_admin, created_at, "birthDate"
      FROM ${sql(userTable)}
      ORDER BY id
    `;
    return users;
  } catch (error) {
    console.error("❌ Error fetching all users:", error);
    throw new Error("Database error while fetching all users");
  }
};

/**
 * Obtiene la información del usuario por su id.
 *
 * @param userId - ID del usuario, obtenido desde res.locals.user.
 * @returns El usuario si se encuentra, o null en caso contrario.
 */
const getMyUserService = async (userId: number): Promise<UserI | undefined> => {
  try {
    const [user] = await sql<UserI[]>`
      SELECT id, username, correo, is_admin, created_at, "birthDate"
      FROM ${sql(userTable)}
      WHERE id = ${userId}
      LIMIT 1;
    `;
    return user ?? null;
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    throw new Error("Database error while fetching user data");
  }
};

const pushFcmUserTokenService = async (userId: number, fcmToken: string): Promise<boolean> => {
  try {
    const result = await sql`
      UPDATE ${sql(userTable)}
      SET "fcm_token" = ${fcmToken}
      WHERE id = ${userId}
      RETURNING id;
    `;
    return result.length > 0;
  } catch (error) {
    console.error("❌ Error updating fcm_token:", error);
    throw new Error("Database error while updating fcm_token");
  }
};

const getFcmUserTokenService = async (userId: number): Promise<string | undefined> => {
  try {
    const [user] = await sql<Array<{ fcm_token: string }>>`
      SELECT "fcm_token"
      FROM ${sql(userTable)}
      WHERE id = ${userId}
      LIMIT 1;
    `;
    return user?.fcm_token ?? null;
  } catch (error) {
    console.error("❌ Error fetching fcm_token:", error);
    throw new Error("Database error while fetching fcm_token");
  }
};

export { getUserService, getUserByIdService, createUserService, findUserByEmail,
  deleteUserByEmail, updateUserTokens, updateBirthDateService, updateUsernameService,
  updatePasswordService, adminUpdateUserService, getUserByIdAdminService, getLeaguesByUserService,
  forgotPasswordService, updateGoogleIdService, getAllUsersService, getMyUserService,
  pushFcmUserTokenService, getFcmUserTokenService };
