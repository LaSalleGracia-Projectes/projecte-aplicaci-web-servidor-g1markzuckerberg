import httpStatus from '../config/httpStatusCodes.js';
import type { Request, Response, NextFunction } from 'express';
import {
  createDraftForRound,
  saveDraftSelection,
  updateTempPlantilla,
  getPlantillaWithPlayers,
  getTempDraft,
} from '../../services/draftService.js';
import type TempPlantilla from '../../types/TempPlantilla.js';
import type { PositionOptions } from '../../types/TempPlantilla.js';
import type Liga from '../../types/Liga.js';

const createDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { formation, liga } = req.body as { formation: string; liga: Liga };
    if (!formation || !liga?.id) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros (formation y/o liga)' });
      return;
    }

    const tempDraft = await createDraftForRound(user.id, formation, liga);
    res.status(httpStatus.ok).json({ tempDraft });
  } catch (error) {
    next(error);
  }
};

const updateDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { plantillaId, playerOptions } = req.body as { plantillaId: number; playerOptions: PositionOptions[] };
    if (!plantillaId || !playerOptions) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros (plantillaId y/o playerOptions)' });
      return;
    }

    await updateTempPlantilla(plantillaId, playerOptions);
    res.status(httpStatus.ok).json({ message: 'Draft actualizado correctamente' });
  } catch (error) {
    next(error);
  }
};

const saveDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { tempDraft } = req.body as { tempDraft: TempPlantilla };
    if (!tempDraft?.id_plantilla || !tempDraft.playerOptions) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros en tempDraft' });
      return;
    }

    await saveDraftSelection(tempDraft);
    res.status(httpStatus.ok).json({ message: 'Draft guardado y finalizado correctamente' });
  } catch (error) {
    next(error);
  }
};

const getDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const liga = req.query.liga as unknown as Liga;
    const roundName = req.query.roundName as string | undefined;

    if (!liga?.id) {
      res.status(httpStatus.badRequest).json({ error: 'Falta parámetro liga' });
      return;
    }

    const { plantilla, players } = await getPlantillaWithPlayers(user.id, liga, roundName);
    res.status(httpStatus.ok).json({ plantilla, players });
  } catch (error) {
    next(error);
  }
};

const getTempDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const plantillaId = Number(req.params.plantillaId);
    if (!plantillaId) {
      res.status(httpStatus.badRequest).json({ error: 'Falta parámetro plantillaId' });
      return;
    }

    const tempDraft = await getTempDraft(plantillaId);
    res.status(httpStatus.ok).json({ tempDraft });
  } catch (error) {
    next(error);
  }
};

export {
  createDraftController,
  updateDraftController,
  saveDraftController,
  getDraftController,
  getTempDraftController,
};
