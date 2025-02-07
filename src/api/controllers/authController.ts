import { type Request, type Response, type NextFunction } from 'express';
import httpStatus from '../config/httpStatusCodes.js';
import { createUserService } from '../../services/userService.js';
import type UserI from '../../types/UserI.js';
import bcrypt from 'bcrypt';

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { email, password } = req.body as { email: string, password: string };

    const hashedPassword: string = await bcrypt.hash(password, 10);

    const user: UserI = {
      mail: String(email),
      password: hashedPassword
    };

    const userCreated = await createUserService(user);
    if (userCreated) {
      res.status(httpStatus.ok).send({ userCreated });
    } else {
      next('Ups! User not created');
    }
  } catch (error) {
    next(error);
  }
}

export { register};