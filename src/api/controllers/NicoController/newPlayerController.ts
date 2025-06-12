import { Request, Response, NextFunction } from 'express';
import httpStatus from '../../config/httpStatusCodes.js';
import {
  getAllNewPlayersService,
  getNewPlayerByIdService,
  createNewPlayerService,
  updateNewPlayerService,
  deleteNewPlayerService
} from '../../../services/NicoServices/newPlayersService.js';

/**
 * GET /new-players
 */
export const getAllNewPlayersController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const players = await getAllNewPlayersService();
    res.status(httpStatus.ok).json({ players });
  } catch (err: any) {
    next(err);
  }
};

/**
 * GET /new-players/:id
 */
export const getNewPlayerByIdController = async (
  req:   Request,
  res:   Response,
  next:  NextFunction
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(httpStatus.badRequest).json({ error: 'El parámetro id debe ser un número válido.' });
    }
    const player = await getNewPlayerByIdService(id);
    if (!player) {
      return res
        .status(httpStatus.notFound)
        .json({ error: `Player with id=${id} not found` });
    }
    res.status(httpStatus.ok).json({ player });
  } catch (err: any) {
    next(err);
  }
};

/**
 * POST /new-players
 */
export const createNewPlayerController = async (
  req:   Request,
  res:   Response,
  next:  NextFunction
) => {
  try {
    const { equipo_id, position_id, displayname, imagepath } = req.body;
    const player = await createNewPlayerService(
      equipo_id,
      position_id,
      displayname,
      imagepath
    );
    res.status(httpStatus.created).json({ player });
  } catch (err: any) {
    next(err);
  }
};

/**
 * PUT /new-players/:id
 */
export const updateNewPlayerController = async (
  req:   Request,
  res:   Response,
  next:  NextFunction
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(httpStatus.badRequest).json({ error: 'El parámetro id debe ser un número válido.' });
    }
    const { equipo_id, position_id, displayname, imagepath } = req.body;
    const updated = await updateNewPlayerService(
      id,
      equipo_id,
      position_id,
      displayname,
      imagepath
    );
    res.status(httpStatus.ok).json({ player: updated });
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith('No existe jugador con id=')) {
      return res
        .status(httpStatus.notFound)
        .json({ error: err.message });
    }
    next(err);
  }
};

/**
 * DELETE /new-players/:id
 */
export const deleteNewPlayerController = async (
  req:   Request,
  res:   Response,
  next:  NextFunction
) => {
  try {
    const id = Number(req.params.id);
    const deleted = await deleteNewPlayerService(id);
    if (!deleted) {
      return res
        .status(httpStatus.notFound)
        .json({ error: `Player with id=${id} not found` });
    }
    res
      .status(httpStatus.ok)
      .json({ message: `Player with id=${id} deleted successfully` });
  } catch (err: any) {
    next(err);
  }
};
