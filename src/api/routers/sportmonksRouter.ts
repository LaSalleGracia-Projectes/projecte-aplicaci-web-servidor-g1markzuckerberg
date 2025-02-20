import { Router } from 'express';
import { getAllPlayersController, getFixturesByRoundNumberController, getCurrentRoundsController, processRoundFantasyPointsController } from '../controllers/sportmonksController.js';

const sportmonksRouter = Router();

// Ruta para obtener todos los jugadores
sportmonksRouter.get('/allPlayers', getAllPlayersController);

// Ruta para obtener fixtures por jornada (según el roundNumber)
sportmonksRouter.get('/jornadas/:roundNumber', getFixturesByRoundNumberController);

// Ruta para obtener la jornada actual
sportmonksRouter.get('/jornadaActual', getCurrentRoundsController);

// Ruta para procesar la ronda completa y calcular los puntos fantasy
sportmonksRouter.get('/processRoundFantasyPoints/:roundId', processRoundFantasyPointsController);


export default sportmonksRouter;