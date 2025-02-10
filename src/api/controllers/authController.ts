import { type Request, type Response, type NextFunction } from 'express';
import { findUserByEmail, createUser } from '../../services/supabaseService.js';
import type UserI from '../../types/UserI.js';
import bcrypt from 'bcrypt';
import httpStatus from '../config/httpStatusCodes.js';

// 🔹 Obtener usuario por email
const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo } = req.params;
    const user = await findUserByEmail(correo);

    if (!user) {
      return res.status(httpStatus.notFound).send({ error: 'User not found' });
    }

    res.status(httpStatus.ok).send({ user });
  } catch (error) {
    next(error);
  }
};

// 🔹 Crear usuario
const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, correo, password } = req.body as { username: string; correo: string; password: string };

    // Verificar si el usuario ya existe
    const existingUser = await findUserByEmail(correo);
    if (existingUser) {
      return res.status(httpStatus.badRequest).send({ error: 'User with this email already exists' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const user: UserI = {
      username,
      correo,
      password: hashedPassword
    };

    const userCreated = await createUser(user);
    res.status(httpStatus.created).send({ user: userCreated });
  } catch (error) {
    next(error);
  }
};

export { getUser, register };
