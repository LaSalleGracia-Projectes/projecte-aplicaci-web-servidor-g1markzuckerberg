import { Router } from 'express';
import { getAllPlayersSupa, getPlayerById } from '../controllers/playserSupaController.js';
const playerRouter = Router();

// http://localhost:3000/api/v1/player?team=Barça&points=down
playerRouter.get('/', getAllPlayersSupa);
playerRouter.get('/:id', getPlayerById);

export default playerRouter;