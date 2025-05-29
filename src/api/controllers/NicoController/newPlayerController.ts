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

/**
 * POST /new-players
 */
export const createNewPlayerController = async (
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
    const { teamName, positionId, name, imageUrl } = req.body;
    const player = await createNewPlayer(teamName, positionId, name, imageUrl);
    res.status(httpStatus.created).json({ player });
  } catch (err: any) {
    next(err);
  }
};

/**
 * PUT /new-players/:id
 */
export const updateNewPlayerController = async (
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
    const { teamName, positionId, name, imageUrl } = req.body;

    const updated = await updateNewPlayer(
      id,
      teamName,
      positionId,
      name,
      imageUrl
    );
    res.status(httpStatus.ok).json({ player: updated });
  } catch (err: any) {
    if (
      err instanceof Error &&
      err.message.startsWith('No existe jugador con id=')
    ) {
      return res.status(httpStatus.notFound).json({ error: err.message });
    }
    next(err);
  }
};