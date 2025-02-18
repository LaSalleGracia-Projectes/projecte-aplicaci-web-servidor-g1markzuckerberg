import { getAllPlayersFromTeams } from '../../services/PlayerService.js';
import { getFixturesByRoundNumber, getCurrentRounds } from '../../services/FixturesService.js';
import { type Request, type Response } from 'express';

// Obtener todos los jugadores
export const getAllPlayers = async (req: Request, res: Response) => {
    try {
        const players = await getAllPlayersFromTeams();
        res.status(200).json(players);
    } catch (error) {
        console.error('Error al obtener jugadores:', error);
        res.status(500).json({
            error: 'Error al obtener los jugadores',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
};

// Obtener jornadas según el número proporcionado
export const getFixturesByRound = async (req: Request, res: Response) => {
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
};

// Obtener la jornada actual
export const getCurrentFixtureRounds = async (req: Request, res: Response) => {
    try {
        const rounds = await getCurrentRounds();
        if (rounds && rounds.length > 0) {
            res.status(200).json({ jornadaActual: rounds });
        } else {
            res.status(404).json({ message: 'No se encontraron jornadas actuales.' });
        }
    } catch (error) {
        console.error('Error al obtener la jornada actual:', error);
        res.status(500).json({
            error: 'Error al obtener la jornada actual',
            message: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
};
