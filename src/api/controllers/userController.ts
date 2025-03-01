import { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import httpStatus from '../config/httpStatusCodes.js';

/**
 * 🔹 **Sube la imagen de perfil del usuario y guarda la URL en la base de datos.**
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

export { uploadUserImageController };
