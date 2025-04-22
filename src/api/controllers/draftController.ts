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

/**
 * Crea (o retorna) el draft para la siguiente jornada.  
 * Se espera en el body:
 * {
 *   formation: string, // Formación elegida ("4-3-3", "4-4-2", "3-4-3")
 *   liga: Liga         // Objeto Liga (al menos debe tener id)
 * }
 *
 * @param req - Request object.
 * @param res - Response object.
 * @param next - Next function.
 * @returns {Promise<void>}
 */
const createDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { formation, ligaId } = req.body as { formation: string; ligaId: number };
    if (!formation || !ligaId) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros (formation y/o liga_id)' });
      return;
    }

    const liga: Liga = { 
      id: ligaId, 
      name: "", 
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_by: "", 
      // eslint-disable-next-line @typescript-eslint/naming-convention
      jornada_id: 0, 
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_jornada: 0, 
      code: "" 
    };
    const tempDraft = await createDraftForRound(user.id, formation, liga);
    res.status(httpStatus.ok).json({ tempDraft });
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Actualiza el JSON de la TempPlantilla (por ejemplo, al modificar el "chosen" en alguna posición).  
 * Se espera en el body:
 * {
 *   plantillaId: number,         // ID de la plantilla (draft)
 *   playerOptions: PositionOptions[] // Array actualizado de opciones de jugadores
 * }
 *
 * @param req - Request object.
 * @param res - Response object.
 * @param next - Next function.
 * @returns {Promise<void>}
 */

const updateDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const ligaId = Number(req.params.ligaId);
    const { playerOptions } = req.body as { playerOptions: PositionOptions[] };

    if (!ligaId || !playerOptions) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros (ligaId y/o playerOptions)' });
      return;
    }

    await updateTempPlantilla(user.id, ligaId, playerOptions);
    res.status(httpStatus.ok).json({ message: 'Draft actualizado correctamente' });
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Guarda la selección final del draft.  
 * Se espera en el body que se envíe el objeto tempDraft completo con la selección final, 
 * donde cada PositionOptions tiene un valor numérico definido en el quinto elemento (0 a 3).
 *
 * @param req - Request object.
 * @param res - Response object.
 * @param next - Next function.
 * @returns {Promise<void>}
 */
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
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Obtiene la plantilla (draft) final junto con los jugadores ya guardados en la relación.  
 * Se espera en query:
 *   - liga: Liga (al menos debe tener id)
 *   - roundName: string (opcional, se usa la jornada actual si no se proporciona)
 *
 * @param req - Request object.
 * @param res - Response object.
 * @param next - Next function.
 * @returns {Promise<void>}
 */
const getDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ligaId = Number(req.query.ligaId);
    const roundName = req.query.roundName as string | undefined;
    const queryUserId = req.query.userId ? Number(req.query.userId) : undefined; // 👈 nuevo parámetro opcional

    if (!ligaId) {
      res.status(httpStatus.badRequest).json({ error: 'Falta parámetro ligaId' });
      return;
    }

    const effectiveUserId: number = queryUserId ?? (res.locals.user as { id: number }).id;

    if (!effectiveUserId) {
      res.status(httpStatus.badRequest).json({ error: 'Falta parámetro userId y usuario no autenticado' });
      return;
    }

    const liga: Liga = {
      id: ligaId,
      name: '',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_by: '',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      jornada_id: 0,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_jornada: 0,
      code: '',
    };

    const { plantilla, players } = await getPlantillaWithPlayers(effectiveUserId, liga, roundName);

    res.status(httpStatus.ok).json({ plantilla, players });
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Obtiene la TempPlantilla (borrador) asociada a una plantilla (draft) que aún puede ser editada.  
 * Se espera en los parámetros de la ruta:
 *   - plantillaId: number
 *
 * @param req - Request object.
 * @param res - Response object.
 * @param next - Next function.
 * @returns {Promise<void>}
 */
const getTempDraftController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const ligaId = Number(req.params.ligaId);
    const roundName = req.query.roundName as string | undefined;

    if (!ligaId) {
      res.status(httpStatus.badRequest).json({ error: 'Falta parámetro ligaId' });
      return;
    }

    const tempDraft = await getTempDraft(user.id, ligaId, roundName);
    res.status(httpStatus.ok).json({ tempDraft });
  } catch (error: unknown) {
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
