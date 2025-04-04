import { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configura multer para almacenar archivos en el directorio de imágenes de ligas
const storage = multer.diskStorage({
  destination(req: Request, file: Express.Multer.File, cb) {

      const dir = path.join(__dirname, '../../../public/img/ligas');
    // Crea el directorio si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename(req: Request, file: Express.Multer.File, cb) {
    try {
      // Se espera que el ID de la liga se pase en los parámetros de la URL
      const { ligaId } = req.params;
      if (!ligaId) {
        cb(new Error('No se encontró el leagueId en la solicitud'), '');
        return;
      }
      // Directorio donde se almacenan las imágenes de ligas
      
      const dir = path.join(__dirname, '../../../public/img/ligas');
      
      // Buscar y eliminar cualquier archivo existente que comience con "leagueImage<ligaId>" (sin importar la extensión)
      const files = fs.readdirSync(dir);
      files.forEach((fileName) => {
        if (fileName.startsWith(`leagueImage${ligaId}`)) {
          fs.unlinkSync(path.join(dir, fileName));
        }
      });
      
      // Construir el nombre del nuevo archivo: leagueImage<ligaId> + extensión original del archivo subido
      const newFileName = `leagueImage${ligaId}${path.extname(file.originalname)}`;
      cb(null, newFileName);
    } catch (error) {
      cb(error as Error, '');
    }
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: (error: Error | undefined, acceptFile: boolean) => void) => {
  try {
    // Solo se aceptan imágenes JPG, JPEG y PNG
    if (file.mimetype.startsWith('image/') && /\.(jpg|jpeg|png)$/i.test(file.originalname)) {
      cb(undefined, true);
    } else {
      cb(new Error('Formato de imagen no permitido. Solo se aceptan JPG, JPEG y PNG.'), false);
    }
  } catch (error) {
    cb(error as Error, false);
  }
};

export const uploadLeagueImage = multer({ storage, fileFilter });