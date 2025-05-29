import { Request, Response, NextFunction } from 'express';
import httpStatus from '../../config/httpStatusCodes.js';
import {
  createNewPlayer,
  getAllNewPlayers,
  getNewPlayerById,
  updateNewPlayer,
  deleteNewPlayer
} from '../../../services/NicoServices/newPlayersService.js';

const ensureAdmin = (res: Response): boolean => {
  const user = res.locals.user as { id: number; is_admin: boolean };
  return user?.is_admin === true;
};

/**
 * GET /new-players
 */
export const getAllNewPlayersController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!ensureAdmin(res)) {
      return res
        .status(httpStatus.unauthorized)
        .json({ error: 'Unauthorized: admin only' });
    }
    const players = await getAllNewPlayers();
    res.status(httpStatus.ok).json({ players });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /new-players/:id
 */
export const getNewPlayerByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!ensureAdmin(res)) {
      return res
        .status(httpStatus.unauthorized)
        .json({ error: 'Unauthorized: admin only' });
    }
    const id = Number(req.params.id);
    const player = await getNewPlayerById(id);
    if (!player) {
      return res
        .status(httpStatus.notFound)
        .json({ error: `Player with id=${id} not found` });
    }
    res.status(httpStatus.ok).json({ player });
  } catch (err) {
    next(err);
  }
};