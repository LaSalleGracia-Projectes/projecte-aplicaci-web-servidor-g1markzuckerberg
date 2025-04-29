import { type Request, type Response, type NextFunction } from 'express';
import httpStatus from '../config/httpStatusCodes.js';
import { getAllPlayersFromSupabase, getPlayerByIdFromSupabase } from '../../services/playerService.js';
import type Player from '../../types/Player.js';

/**
 * Controlador para obtener todos los jugadores desde Supabase.
 */
async function getAllPlayersSupa(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Leer y validar query params
    const { points, team } = req.query;
    let sortPoints: 'up' | 'down' | undefined;
    if (points === 'up' || points === 'down') {
      sortPoints = points;
    }

    const teamName = typeof team === 'string' && team.trim() !== ''
      ? team.trim()
      : undefined;

    const players = await getAllPlayersFromSupabase(sortPoints, teamName);
    res.status(httpStatus.ok).json({ players });
  } catch (error: unknown) {
    next(error);
  }
}

/**
* Controlador para obtener un jugador por ID desde Supabase.
*/
async function getPlayerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const playerId: number = parseInt(id, 10);
    
    if (isNaN(playerId)) {
      res.status(httpStatus.badRequest).json({ message: 'Invalid player id' });
      return;
    }

    // No hagas cast a undefined; solamente espera el resultado.
    const player = await getPlayerByIdFromSupabase(playerId) as Player | undefined;
    
    if (!player) {
      res.status(httpStatus.notFound).json({ message: 'Player not found' });
      return;
    }
    
    // Se asume que player ya incluye los campos adicionales (por ejemplo, teamName y teamImage)
    res.status(httpStatus.ok).json({ player });
  } catch (error: unknown) {
    next(error);
  }
}

export { getAllPlayersSupa, getPlayerById };