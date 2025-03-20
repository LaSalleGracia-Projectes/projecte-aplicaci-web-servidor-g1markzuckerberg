import { Router, type RequestHandler } from 'express';
import { getAllPlayers, getFixturesByRound, getCurrentFixtureRounds, processRoundFantasyPointsController, getSeasonId, getRoundsBySeason } from '../controllers/sportmonksController.js';
import { getTeams } from '../controllers/sportmonksController.js';
/**
 * @module sportmonksRouter
 * @description Rutas para interactuar con la API de Sportmonks y obtener información de fútbol.
 */

const sportmonksRouter = Router();
/**
 * @route GET /allPlayers
 * @description Obtiene todos los jugadores de los equipos disponibles.
 */
sportmonksRouter.get('/allPlayers', getAllPlayers);

/**
 * @route GET /jornadas/:roundNumber
 * @description Obtiene los fixtures (partidos) de una jornada específica.
 * @param {string} roundNumber - Número de la jornada a consultar.
 */
sportmonksRouter.get('/jornadas/:roundNumber', getFixturesByRound);

/**
 * @route GET /jornadaActual
 * @description Obtiene la jornada actual en curso.
 */
sportmonksRouter.get('/jornadaActual', getCurrentFixtureRounds);

/**
 * @route GET /processRoundFantasyPoints/:roundId
 * @description Procesa los puntos fantasy de una jornada específica.
 * @param {number} roundId - ID de la jornada.
 */
sportmonksRouter.get('/processRoundFantasyPoints/:roundId', processRoundFantasyPointsController);

/**
 * @route GET /seasonActual
 * @description Obtiene el ID de la temporada actual de La Liga.
 */
sportmonksRouter.get("/seasonActual", getSeasonId as RequestHandler);
sportmonksRouter.get("/jornadasBySeason/:seasonId", getRoundsBySeason as RequestHandler);

/**
 * @route GET /teams
 * @description Obtiene los equipos de la temporada actual de La Liga.
 */
sportmonksRouter.get("/teams", getTeams as RequestHandler);
export default sportmonksRouter;