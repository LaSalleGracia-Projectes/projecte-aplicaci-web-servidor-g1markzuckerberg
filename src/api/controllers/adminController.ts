import { type Request, type Response, type NextFunction } from 'express';
import { findUserByEmail, deleteUserByEmail } from '../../services/userService.js';
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

const deleteAccountByMail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo } = req.body as { correo: string };

    if (!correo) {
      return res.status(httpStatus.badRequest).send({ error: 'Email is required' });
    }

    // Buscar al usuario
    const user = await findUserByEmail(correo);
    if (!user) {
      return res.status(httpStatus.notFound).send({ error: 'User not found' });
    }

    // Eliminar usuario de la base de datos
    const deleteSuccess = await deleteUserByEmail(correo);
    if (!deleteSuccess) {
      return res.status(httpStatus.internalServerError).send({ error: 'Could not delete user' });
    }

    res.status(httpStatus.ok).send({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    next(error);
  }
};

export { getUserByMail, deleteAccountByMail };