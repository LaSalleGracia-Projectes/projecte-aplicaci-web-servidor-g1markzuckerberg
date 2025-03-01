import { type Request, type Response, type NextFunction } from 'express';
import { findUserByEmail, deleteUserByEmail } from '../../services/userService.js';
import httpStatus from '../config/httpStatusCodes.js';
import type UserI from '../../types/UserI.js';
import { getUserByIdAdminService, adminUpdateUserService } from '../../services/userService.js';

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

/**
 * 🔹 **Editar usuario como administrador (solo los campos modificados)**
 */
const adminUpdateUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = res.locals.user as { id: number, is_admin: boolean };
    const userId = Number(req.params.userId);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, birthDate, is_admin, password } = req.body as Partial<UserI>;

    const currentUser = await getUserByIdAdminService(admin.id, userId);
    if (!currentUser) {
      return res.status(httpStatus.notFound).json({ error: 'User not found' });
    }

    const updates: Partial<UserI> = {};
    if (username && username !== currentUser.username) updates.username = username;
    if (birthDate && birthDate !== currentUser.birthDate) updates.birthDate = birthDate;
    if (is_admin !== undefined && is_admin !== currentUser.is_admin) updates.is_admin = is_admin;
    if (password) updates.password = password;

    if (Object.keys(updates).length === 0) {
      return res.status(httpStatus.ok).json({ message: 'No changes were made' });
    }

    const updatedUser = await adminUpdateUserService(admin.id, userId, updates);
    res.status(httpStatus.ok).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error: any) {
    // Si el error indica falta de permisos, respondemos con 403 Forbidden
    if (error instanceof Error && typeof error.message === 'string' && error.message.startsWith("Unauthorized")) {
      return res.status(httpStatus.unauthorized).json({ error: error.message });
    }
    
    next(error);
  }
};




export { getUserByMail, deleteAccountByMail, adminUpdateUserController };