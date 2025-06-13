import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from '../config/httpStatusCodes.js';

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization) {
    const header = req.headers.authorization.split(' ');
    if (header[0] === 'Bearer') {
      const token = header[1];
      const secretKey = process.env.JWT_SECRET_KEY ?? 'secret';
      try {
        const decoded = jwt.verify(token, secretKey);
        if (decoded && typeof decoded === 'object') {
          // Normaliza los campos para que siempre haya correo, id, is_admin
          const user = {
            id: decoded.id,
            correo: decoded.correo,
            is_admin: decoded.is_admin ?? decoded.isAdmin ?? false
          };
          res.locals.user = user;
          next();
          return;
        }
      } catch (err) {
        // Token inválido
        return res.status(httpStatus.unauthorized).send({
          error: 'Token inválido o expirado.'
        });
      }
    }
  }

  return res.status(httpStatus.unauthorized).send({
    error: 'No estás autorizado para realizar esta acción.'
  });
};

export default authMiddleware;