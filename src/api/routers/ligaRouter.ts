import { Router } from 'express';
import { createLiga, joinLiga } from '../controllers/ligaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const ligaRouter = Router();

ligaRouter.post('/create', authMiddleware, createLiga);
ligaRouter.get('/join/:ligaCode', authMiddleware, joinLiga); // Ahora se requiere autenticación

export default ligaRouter;
