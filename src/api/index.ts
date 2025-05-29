import express, { Router } from 'express';
import authRouter from './routers/authRouter.js';
import sportmonksRouter from './routers/sportmonksRouter.js';
import userRouter from './routers/userRouter.js';
import ligaRouter from './routers/ligaRouter.js';
import adminRouter from './routers/adminRouter.js';
import partidoRouter from './routers/partidoRouter.js';
import jornadaJugadorRouter from './routers/jornadaJugadorRouter.js';
import playerRouter from './routers/playerRouter.js';
import draftRouter from './routers/draftRouter.js';
import contactFormRouter from './routers/contactFormRouter.js';
import grafanaRouter from './routers/grafanaRouter.js';
import newPlayerRouter from './routers/NicoRouter/NicoRouter.js';

const apiRouter = Router();

// Per obtenir el body en format json
apiRouter.use(express.json());
// Agregar rutas de autenticación
apiRouter.use('/auth', authRouter);

apiRouter.use('/sportmonks', sportmonksRouter);

apiRouter.use('/liga', ligaRouter);

apiRouter.use('/admin', adminRouter);

apiRouter.use('/user', userRouter);

apiRouter.use('/partidos', partidoRouter);

apiRouter.use('/jornadaJugador', jornadaJugadorRouter);

apiRouter.use('/player', playerRouter);

apiRouter.use('/draft', draftRouter);

apiRouter.use('/contactForm', contactFormRouter);

apiRouter.use('/grafana', grafanaRouter);

apiRouter.use('/new-players', newPlayerRouter);

export default apiRouter;