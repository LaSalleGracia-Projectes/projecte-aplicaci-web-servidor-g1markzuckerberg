import express, { Router } from 'express';
import authRouter from './routers/authRouter.js';


const apiRouter = Router();

// Per obtenir el body en format json
apiRouter.use(express.json());

// Agregar rutas de autenticación
apiRouter.use('/auth', authRouter);

export default apiRouter;