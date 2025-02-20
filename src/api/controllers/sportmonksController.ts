import type { Request, Response } from 'express';
import { processRoundFantasyPoints } from '../../services/fantasyService.js';
import { getAllPlayersFromTeams } from '../../services/PlayerService.js';
import { getFixturesByRoundNumber, getCurrentRounds } from '../../services/FixturesService.js';

/**
 * Devuelve todos los jugadores.
 */
export async function getAllPlayersController(req: Request, res: Response): Promise<void> {
    try {
        const players = await getAllPlayersFromTeams();
        res.status(200).json(players);
    } catch (error) {
        console.error('Error al obtener los jugadores:', error);
        res.status(500).json({
            error: 'Error al obtener los jugadores',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
}

/**
 * Devuelve los fixtures de una jornada según el número de ronda.
 */
export async function getFixturesByRoundNumberController(req: Request, res: Response): Promise<void> {
    const { roundNumber } = req.params;
    try {
        const fixtures = await getFixturesByRoundNumber(roundNumber);
        res.status(200).json({
            jornada: roundNumber,
            fixtures,
        });
    } catch (error) {
        console.error('Error al obtener las jornadas:', error);
        res.status(500).json({
            error: 'Error al obtener las jornadas',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
}

/**
 * Devuelve la jornada actual.
 */
export async function getCurrentRoundsController(req: Request, res: Response): Promise<void> {
    try {
        const rounds = await getCurrentRounds();
        if (rounds && rounds.length > 0) {
            res.status(200).json({
                jornadaActual: rounds,
            });
        } else {
            res.status(404).json({
                message: 'No se encontraron jornadas actuales.',
            });
        }
    } catch (error) {
        console.error('Error al obtener la jornada actual:', error);
        res.status(500).json({
            error: 'Error al obtener la jornada actual',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
}

/**
 * Procesa la ronda completa para calcular los puntos fantasy de cada jugador.
 */
export async function processRoundFantasyPointsController(req: Request, res: Response): Promise<void> {
    const roundId = Number(req.params.roundId);
    if (isNaN(roundId)) {
        res.status(400).json({ error: 'roundId debe ser un número válido.' });
        return;
    }

    try {
        const results = await processRoundFantasyPoints(roundId);
        res.status(200).json({
            message: 'Puntos fantasy de la ronda procesados correctamente.',
            results,
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error procesando los puntos fantasy de la ronda.',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
