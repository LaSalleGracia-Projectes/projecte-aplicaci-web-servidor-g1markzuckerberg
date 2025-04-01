import { Router } from 'express';
import { createLiga, joinLiga, getUsersByLiga, getLigaCodeById, removeUserFromLiga } from '../controllers/ligaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const ligaRouter = Router();

ligaRouter.post('/create', authMiddleware, createLiga);
ligaRouter.post('/join/:ligaCode', authMiddleware, joinLiga); // Ahora se requiere autenticación
// Example: /api/v1/ligas/users/ABC123?jornada_id=22
ligaRouter.get('/users/:ligaCode', authMiddleware, getUsersByLiga);
ligaRouter.get('/code/:ligaId', authMiddleware, getLigaCodeById);
ligaRouter.delete('/kickUser/:ligaId/:userId', authMiddleware, removeUserFromLiga);

export default ligaRouter;
