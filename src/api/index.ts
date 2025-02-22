import express, { Router } from 'express';
import authRouter from './routers/authRouter.js';
import sportmonksRouter from './routers/sportmonksRouter.js';
import ligaRouter from './routers/ligaRouter.js';

const apiRouter = Router();

// Per obtenir el body en format json
apiRouter.use(express.json());
// Agregar rutas de autenticación
apiRouter.use('/auth', authRouter);

apiRouter.use('/sportmonks', sportmonksRouter);

apiRouter.use('/liga', ligaRouter);


export default apiRouter;