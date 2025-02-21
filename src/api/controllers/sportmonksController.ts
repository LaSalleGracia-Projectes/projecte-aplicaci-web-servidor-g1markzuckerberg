import { type Request, type Response } from 'express';
import { getAllPlayersFromTeams } from '../../services/playerService.js';
import { getFixturesByRoundNumber, getCurrentRounds } from '../../services/fixturesService.js';
import { processRoundFantasyPoints } from '../../services/fantasyService.js';

// Obtener todos los jugadores
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

// Obtener jornadas según el número proporcionado
export const getFixturesByRound = (req: Request, res: Response) => {
    const { roundNumber } = req.params;

    getFixturesByRoundNumber(roundNumber)
        .then((fixtures) => res.status(200).json({ jornada: roundNumber, fixtures }))
        .catch((error) => {
            console.error('Error al obtener las jornadas:', error);
            res.status(500).json({
                error: 'Error al obtener las jornadas',
                message: error instanceof Error ? error.message : 'Error desconocido',
            });
        });
};

// Obtener la jornada actual
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

// Procesar los puntos fantasy de una ronda
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
