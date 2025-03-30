import type { Request, Response } from 'express';
import { uploadRoundFantasyPoints } from '../../services/jornadaJugadorService.js';

/**
 * Controller para procesar y subir las puntuaciones fantasy de una ronda a la tabla "jornada_jugador".
 *
 * La URL debe incluir el parámetro "roundId", el cual se utiliza tanto para calcular las puntuaciones
 * como para asignar el valor a la columna "jornada_id" en la base de datos.
 *
 * @param {Request} req - Objeto de solicitud HTTP.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Responde con un JSON que contiene el mensaje y los resultados o un error en caso de fallo.
 */
export const uploadRoundFantasyPointsController = async (req: Request, res: Response): Promise<void> => {
    const roundId = Number(req.params.roundId);
    if (isNaN(roundId)) {
        res.status(400).json({ error: 'roundId debe ser un número válido.' });
        return;
    }

    try {
        const insertedResults = await uploadRoundFantasyPoints(roundId);
        res.status(200).json({
            message: 'Puntos fantasy de la ronda procesados e insertados correctamente (solo jugadores existentes).',
            results: insertedResults,
        });
    } catch (error: any) {
        console.error('Error procesando y subiendo las puntuaciones:', error);
        res.status(500).json({
            error: 'Error procesando y subiendo los puntos fantasy.',
            details: error instanceof Error ? error.message : String(error),
        });
    }
};
