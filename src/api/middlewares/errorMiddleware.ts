import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from '../config/httpStatusCodes.js';

const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err); // Loggear el error para depuración
  if (err instanceof Error) {
    res.status(httpStatus.internalServerError).send({
      error: err.message || 'Un error inesperado ocurrió, contacta con el administrador del sistema.'
    });
  }
};

export default errorMiddleware;