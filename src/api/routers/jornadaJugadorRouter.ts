import { Router } from 'express';
import { uploadRoundFantasyPointsController } from '../controllers/jornadaJugadorController.js';

const jornadaJugadorRouter = Router();

/**
 * @route GET /api/v1/jornadaJugador/processRoundFantasyPoints/:roundId
 * @description Procesa las puntuaciones fantasy de la ronda indicada por roundId y las inserta en la tabla "jornada_jugador".
 *
 * Ejemplo:
 * GET http://localhost:3000/api/v1/jornadaJugador/processRoundFantasyPoints/339322
 *
 * Parámetros:
 * - roundId: ID de la ronda a procesar.
 */
jornadaJugadorRouter.get('/processRoundFantasyPoints/:roundId', uploadRoundFantasyPointsController);

export default jornadaJugadorRouter;
