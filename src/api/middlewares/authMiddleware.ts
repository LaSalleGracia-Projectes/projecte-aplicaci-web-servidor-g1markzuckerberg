import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from '../config/httpStatusCodes.js';

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization) {
    const header = req.headers.authorization.split(' ');
    if (header[0] === 'Bearer') {
      const token = header[1];
      const secretKey = process.env.JWT_SECRET_KEY ?? 'secret';
      const decoded = jwt.verify(token, secretKey);
      if (decoded) {
        // Send decoded data to the next middleware
        res.locals.user = decoded;
        next();
        return;
      }
    }
  }

  return res.status(httpStatus.unauthorized).send({
    error: 'No estás autorizado para realizar esta acción.'
  });
};

export default authMiddleware;