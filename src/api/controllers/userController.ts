import { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import httpStatus from '../config/httpStatusCodes.js';
import { updateUsernameService, updateBirthDateService, updatePasswordService, getLeaguesByUserService,
  forgotPasswordService, getMyUserService } from '../../services/userService.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * **Sube la imagen de perfil del usuario y guarda la URL en la base de datos.**
 * - 📤 Guarda la imagen en `public/img/users/{userId}.jpg`
 */
const uploadUserImageController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(httpStatus.badRequest).json({ error: 'No se ha subido ninguna imagen.' });
    }

    // ✅ Obtener userId desde el token (res.locals.user lo obtiene de `authMiddleware`)
    const user = res.locals.user as { id: number };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).json({ error: 'No autorizado.' });
    }

    req.body.userId = user.id;

    // Construir la URL relativa de la imagen
    const imageUrl = `/img/${user.id}${path.extname(req.file.originalname)}`;

    res.status(httpStatus.ok).json({ message: 'Imagen subida correctamente.', imageUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * 🔹 **Actualizar el username del usuario autenticado**
 */
const updateUsernameController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user as { id: number };
    const { username } = req.body as { username: string };

    if (!username) {
      return res.status(httpStatus.badRequest).json({ error: 'Username is required' });
    }

    const updatedUser = await updateUsernameService(user.id, username);

    res.status(httpStatus.ok).json({ message: 'Username updated successfully', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * 🔹 **Actualizar la fecha de nacimiento del usuario autenticado**
 */
const updateBirthDateController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user as { id: number };
    const { birthDate } = req.body as { birthDate: Date };

    if (!birthDate) {
      return res.status(httpStatus.badRequest).json({ error: 'Birth date is required' });
    }

    const updatedUser = await updateBirthDateService(user.id, birthDate);

    res.status(httpStatus.ok).json({ message: 'Birth date updated successfully', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * 🔹 **Actualizar la contraseña del usuario autenticado**
 */
const updatePasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user as { id: number };
    const { password, newPassword, confirmPassword } = req.body as { password: string; newPassword: string; confirmPassword: string };

    if (!password || !newPassword || !confirmPassword) {
      return res.status(httpStatus.badRequest).json({ error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(httpStatus.badRequest).json({ error: 'New password and confirm password do not match' });
    }

    const success = await updatePasswordService(user.id, password, newPassword);

    if (!success) {
      return res.status(httpStatus.unauthorized).json({ error: 'Incorrect current password' });
    }

    res.status(httpStatus.ok).json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener todas las ligas en las que el usuario autenticado está inscrito,
 * incluyendo los datos de la liga y `puntos_totales`.
 * Ruta: GET /api/v1/users/leagues
 */
const getUserLeagues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtenemos el usuario autenticado (por ejemplo, a partir del token, que se asigna en res.locals.user)
    const user = res.locals.user as { id: number };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }

    // Obtenemos las ligas del usuario, incluyendo puntos_totales
    const leagues = await getLeaguesByUserService(user.id);
    return res.status(httpStatus.ok).json({ leagues });
  } catch (error) {
    next(error);
  }
};

const getUserImageController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtenemos el usuario logueado de res.locals.user
    const loggedUser = res.locals.user as { id: number };

    // Opcionalmente, se puede pasar el id del usuario cuya imagen se desea obtener
    // ya sea como query parameter (/?userId=XX) o como parámetro de ruta (/:userId)
    const userIdParam = req.query.userId ?? req.params.userId;
    // Si se pasa, lo convertimos a number; de lo contrario se usa el id del usuario logueado.
    const userId = userIdParam ? Number(userIdParam) : loggedUser.id;

    if (!userId) {
      return res.status(httpStatus.unauthorized).json({ error: 'No autorizado' });
    }

    // Determinamos la carpeta de imágenes
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dir = path.join(__dirname, '../../../public/img/users');

    // Leemos la carpeta y buscamos el archivo que empieza por "userImage{userId}"
    const files = fs.readdirSync(dir);
    const imageFile = files.find(fileName => fileName.startsWith(`userImage${userId}`));

    // Si no se encuentra una imagen específica, se usa una imagen por defecto
    const imagePath = imageFile
      ? path.join(dir, imageFile)
      : path.join(dir, 'defaultUser.png');

    res.sendFile(imagePath);
  } catch (error) {
    next(error);
  }
};


const forgotPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo } = req.body as { correo: string };
    if (!correo) {
      return res.status(httpStatus.badRequest).json({ error: 'El correo es obligatorio' });
    }

    await forgotPasswordService(correo);
    res.status(httpStatus.ok).json({ message: 'Nueva contraseña enviada al correo' });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para que el usuario consulte sus propios datos.
 * Se asume que el middleware de autenticación coloca en res.locals.user el usuario autenticado.
 *
 * Ejemplo de ruta: GET /api/v1/user/me
 */
const getMyUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Se extrae el usuario autenticado de res.locals
    const currentUser = res.locals.user as { id: number };
    if (!currentUser?.id) {
      return res.status(httpStatus.unauthorized).json({ error: 'No autorizado' });
    }

    // Se obtiene la información del usuario usando el id extraído desde res.locals
    const userData = await getMyUserService(currentUser.id);
    if (!userData) {
      return res.status(httpStatus.notFound).json({ error: 'Usuario no encontrado' });
    }

    res.status(httpStatus.ok).json({ user: userData });
  } catch (error) {
    next(error);
  }
};

export { uploadUserImageController, updateUsernameController, updateBirthDateController,
  updatePasswordController, getUserLeagues, getUserImageController, forgotPasswordController,
  getMyUserController };
