import { Router } from 'express';
import { getAllPlayers, getFixturesByRound, getCurrentFixtureRounds } from '../controllers/sportmonksController.js';

const sportmonksRouter = Router();

sportmonksRouter.get('/allPlayers', getAllPlayers);
sportmonksRouter.get('/jornadas/:roundNumber', getFixturesByRound);
sportmonksRouter.get('/jornadaActual', getCurrentFixtureRounds);

export default sportmonksRouter;
