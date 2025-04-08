import { type Request, type Response, type NextFunction } from 'express';
import httpStatus from '../config/httpStatusCodes.js';
import { getAllPlayersFromSupabase, getPlayerByIdFromSupabase } from '../../services/playerService.js';

/**
 * Controlador para obtener todos los jugadores desde Supabase.
 */
async function getAllPlayersSupa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const players = await getAllPlayersFromSupabase();
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

    const player = await getPlayerByIdFromSupabase(playerId) as undefined;
    
    if (!player) {
      res.status(httpStatus.notFound).json({ message: 'Player not found' });
      return;
    }
    
    res.status(httpStatus.ok).json({ player });
  } catch (error: unknown) {
    next(error);
  }
}

export { getAllPlayersSupa, getPlayerById };