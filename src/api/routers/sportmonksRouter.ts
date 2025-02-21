import { Router } from 'express';
import { getAllPlayers, getFixturesByRound, getCurrentFixtureRounds,processRoundFantasyPointsController } from '../controllers/sportmonksController.js';

const sportmonksRouter = Router();

sportmonksRouter.get('/allPlayers', getAllPlayers);
sportmonksRouter.get('/jornadas/:roundNumber', getFixturesByRound);
sportmonksRouter.get('/jornadaActual', getCurrentFixtureRounds);
sportmonksRouter.get('/processRoundFantasyPoints/:roundId', processRoundFantasyPointsController);

export default sportmonksRouter;