import { type Request, type Response } from 'express';
import { getAllPlayersFromTeams } from '../../services/playerService.js';
import { getFixturesByRoundNumber, getCurrentRounds, getCurrentSeasonId, getRoundsBySeasonId } from '../../services/fixturesService.js';
import { processRoundFantasyPoints } from '../../services/fantasyService.js';
import { getTeamsByCurrentSeason } from '../../services/teamService.js';
/**
 * Controlador para obtener todos los jugadores de los equipos disponibles.
 *
 * @param {Request} req - Objeto de solicitud HTTP.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {void} Responde con un JSON que contiene la lista de jugadores o un mensaje de error.
 */
export const getAllPlayers = (req: Request, res: Response) => {
    getAllPlayersFromTeams()
        .then((players) => res.status(200).json(players))
        .catch((error) => {
            console.error('Error al obtener jugadores:', error);
            res.status(500).json({
                error: 'Error al obtener los jugadores',
                message: error instanceof Error ? error.message : 'Error desconocido',
            });
        });
};

/**
 * Controlador para obtener los fixtures (partidos) de una jornada específica.
 *
 * @param {Request} req - Objeto de solicitud HTTP con el número de jornada en los parámetros.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {void} Responde con un JSON que contiene los fixtures de la jornada o un mensaje de error.
 */
export const getFixturesByRound = async (req: Request, res: Response) => {
    const { roundNumber } = req.params;
    try {
      const fixtures = await getFixturesByRoundNumber(roundNumber);
      res.status(200).json({ jornada: roundNumber, fixtures });
    } catch (error) {
      console.error('Error al obtener las jornadas:', error);
      res.status(500).json({
        error: 'Error al obtener las jornadas',
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };
/**
 * Controlador para obtener la jornada actual en curso.
 *
 * @param {Request} req - Objeto de solicitud HTTP.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {void} Responde con un JSON que contiene la jornada actual o un mensaje de error si no se encuentra.
 */

export const getCurrentFixtureRounds = (req: Request, res: Response) => {
    getCurrentRounds()
        .then((rounds) => {
            if (rounds.length > 0) {
                res.status(200).json({ jornadaActual: rounds[0] });
            } else {
                res.status(404).json({ message: 'No se encontraron jornadas actuales.' });
            }
        })
        .catch((error) => {
            console.error('Error al obtener la jornada actual:', error);
            res.status(500).json({
                error: 'Error al obtener la jornada actual',
                message: error instanceof Error ? error.message : 'Error desconocido',
            });
        });
};

/**
 * Controlador para procesar los puntos fantasy de una ronda específica.
 *
 * @param {Request} req - Objeto de solicitud HTTP con el `roundId` en los parámetros.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {void} Responde con un JSON confirmando el procesamiento o un mensaje de error.
 */
export const processRoundFantasyPointsController = (req: Request, res: Response) => {
    const roundId = Number(req.params.roundId);
    if (isNaN(roundId)) {
        res.status(400).json({ error: 'roundId debe ser un número válido.' });
        return;
    }

    processRoundFantasyPoints(roundId)
        .then((results) => {
            res.status(200).json({
                message: 'Puntos fantasy de la ronda procesados correctamente.',
                results,
            });
        })
        .catch((error) => {
            console.error('Error procesando los puntos fantasy de la ronda:', error);
            res.status(500).json({
                error: 'Error procesando los puntos fantasy de la ronda.',
                details: error instanceof Error ? error.message : String(error),
            });
        });
};

/**
 * Controlador para manejar la solicitud de obtención del ID de la temporada actual de La Liga.
 *
 * @param {Request} req - Objeto de solicitud HTTP.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con el `season_id` si se encuentra, o un mensaje de error.
 */
export const getSeasonId = async (req: Request, res: Response) => {
    try {
        const seasonId = await getCurrentSeasonId();

        if (seasonId) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            res.status(200).json({ season_id: seasonId });
        } else {
            res.status(404).json({ message: "No se encontró la temporada actual." });
        }
    } catch (error) {
        console.error("Error al obtener la temporada actual:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * Controlador para obtener todas las jornadas (rounds) de una temporada en base al `season_id`.
 *
 * @param {Request} req - Objeto de solicitud HTTP con el `season_id` en los parámetros.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un JSON que contiene todas las jornadas o un mensaje de error.
 */
export const getRoundsBySeason = async (req: Request, res: Response) => {
    try {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { seasonId } = req.params;
        const seasonIdNumber = Number(seasonId);

        if (isNaN(seasonIdNumber)) {
            return res.status(400).json({ error: 'El season_id debe ser un número válido.' });
        }

        const rounds = await getRoundsBySeasonId(seasonIdNumber);

        if (rounds.length > 0) {
            res.status(200).json({ rounds });
        } else {
            res.status(404).json({ message: 'No se encontraron jornadas para esta temporada.' });
        }
    } catch (error) {
        console.error('Error al obtener las jornadas de la temporada:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Controller que devuelve los equipos de la temporada actual de La Liga.
 * @param req
 * @param res id, name, imagePath
 */
export const getTeams = async (req: Request, res: Response) => {
    try {
        const teams = await getTeamsByCurrentSeason();
        res.json(teams);
    } catch (_) {
        res.status(500).json({ message: "Error al obtener los equipos" });
    }
}