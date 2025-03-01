import express, { Router } from 'express';
import authRouter from './routers/authRouter.js';
import sportmonksRouter from './routers/sportmonksRouter.js';
import userRouter from './routers/userRouter.js';
import ligaRouter from './routers/ligaRouter.js';

const apiRouter = Router();

// Per obtenir el body en format json
apiRouter.use(express.json());
// Agregar rutas de autenticación
apiRouter.use('/auth', authRouter);

apiRouter.use('/sportmonks', sportmonksRouter);

apiRouter.use('/liga', ligaRouter);

apiRouter.use('/user', userRouter);


export default apiRouter;