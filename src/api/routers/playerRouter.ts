import { Router } from 'express';
import { getAllPlayersSupa, getPlayerById } from '../controllers/playserSupaController.js';
const playerRouter = Router();

playerRouter.get('/', getAllPlayersSupa);
playerRouter.get('/:id', getPlayerById);

export default playerRouter;