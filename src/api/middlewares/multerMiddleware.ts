import { type Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type UserI from '../../types/UserI';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configura multer para almacenar archivos en el directorio deseado
const storage = multer.diskStorage({
  destination(req: Request, file: Express.Multer.File, cb) {
    const dir = path.join(__dirname, '../../../public/img/users');

    // Crea el directorio si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename(req: Request, file: Express.Multer.File, cb) {
    try {
      // Obtener el usuario desde la request o res.locals
      const user: UserI | undefined = (req as Request & { user?: UserI }).user
        ?? (req as Request & { res?: { locals?: { user?: UserI } } }).res?.locals?.user;

      if (!user?.id) {
        cb(new Error('No se encontró el userId en la solicitud'), '');
        return;
      }

      // Directorio destino
      const dir = path.join(__dirname, '../../../public/img/users');

      // Buscar y eliminar cualquier archivo existente que comience con "userImage<user.id>"
      // sin importar la extensión
      const files = fs.readdirSync(dir);
      files.forEach((fileName) => {
        if (fileName.startsWith(`userImage${user.id}`)) {
          fs.unlinkSync(path.join(dir, fileName));
        }
      });

      // Construir el nombre del nuevo archivo con el userId y la extensión actual del archivo subido
      const newFileName = `userImage${user.id}${path.extname(file.originalname)}`;
      cb(null, newFileName);
    } catch (error) {
      cb(error as Error, '');
    }
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: (error: Error | undefined, acceptFile: boolean) => void) => {
  try {
    if (file.mimetype.startsWith('image/') && /\.(jpg|jpeg|png)$/i.test(file.originalname)) {
      cb(undefined, true);
    } else {
      cb(new Error('Formato de imagen no permitido. Solo se aceptan JPG, JPEG y PNG.'), false);
    }
  } catch (error) {
    cb(error as Error, false);
  }
};

export const upload = multer({ storage, fileFilter });
