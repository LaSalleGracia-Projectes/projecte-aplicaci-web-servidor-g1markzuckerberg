import { Router } from 'express';
import { getAllPlayersFromTeams } from '../../services/PlayerService.js';
import { getFixturesByRoundNumber, getCurrentRounds } from '../../services/FixturesService.js';

const sportmonksRouter = Router();

// Ruta para obtener todos los jugadores
sportmonksRouter.get('/allPlayers', getAllPlayersFromTeams);

// Nueva ruta: Obtener jornadas según el número proporcionado
sportmonksRouter.get('/jornadas/:roundNumber', async (req, res) => {
    const { roundNumber } = req.params; // Capturar el parámetro de la URL

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
});
sportmonksRouter.get('/jornadaActual', async (req, res) => {
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
});

export default sportmonksRouter;
