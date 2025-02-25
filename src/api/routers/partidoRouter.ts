import { Router } from 'express';
import { getMatchStatsController } from '../controllers/partidoController.js';
const partidoRouter = Router();

/**
 * @route GET /stats/:roundId/:fixtureId
 * @description Obtiene las estadísticas completas de un partido de una jornada específica.
 * @param {number} roundId - ID de la jornada.
 * @param {number} fixtureId - ID del partido.
 */
partidoRouter.get("/stats/:roundId/:fixtureId", getMatchStatsController);

export default partidoRouter;