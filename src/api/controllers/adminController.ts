import { type Request, type Response, type NextFunction } from 'express';
import { findUserByEmail } from '../../services/supabaseService.js';
import httpStatus from '../config/httpStatusCodes.js';

const getUserByMail = async (req: Request, res: Response, next: NextFunction) => {
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

export { getUserByMail };