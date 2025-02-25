import type { Request, Response } from "express";
import { getMatchStatistics } from "../../services/partidoService.js";

/**
 * Controlador para manejar la solicitud de estadísticas de un partido específico.
 *
 * @param {Request} req - Objeto de solicitud HTTP con `roundId` y `fixtureId` en los parámetros.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @returns {Promise<void>} Devuelve las estadísticas del partido en formato JSON.
 */
export const getMatchStatsController = async (
    req: Request,
    res: Response
): Promise<void> => {
    const fixtureId = Number(req.params.fixtureId);

    if (isNaN(fixtureId)) {
        res
            .status(400)
            .json({ error: "roundId y fixtureId deben ser números válidos." });
        return;
    }

    try {
        const stats = await getMatchStatistics(fixtureId);

        if (stats) {
            res.status(200).json(stats);
        } else {
            res
                .status(404)
                .json({ message: "No se encontraron estadísticas para este partido." });
        }
    } catch (error) {
        console.error("Error al obtener estadísticas del partido:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};