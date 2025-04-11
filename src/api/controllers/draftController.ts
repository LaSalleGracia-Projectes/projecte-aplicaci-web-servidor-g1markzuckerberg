import httpStatus from '../config/httpStatusCodes.js';
import type { Request, Response, NextFunction } from 'express';
import { createDraftForRound, saveDraftSelection, updateTempPlantilla, getPlantillaWithPlayers } from '../../services/draftService.js';
import type TempPlantilla from '../../types/TempPlantilla.js';
import type { PositionOptions } from '../../types/TempPlantilla.js';
import type Round from '../../types/Round.js';

/**
 * Crea (o retorna) el draft para una ronda.
 * El usuario debe estar autenticado (datos en res.locals.user).
 * Se espera que en el body se reciban:
 *   - formation: string, la formación elegida ("4-3-3", "4-4-2", "3-4-3")
 *   - round: objeto Round con la información de la ronda (al menos: ending_at, season_id y name)
 * Opcionalmente, si el teamId no se obtiene desde el usuario autenticado, puede venir en el body.
 */
async function createDraftController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Requiere autenticación: se asume que el middleware coloca la info del usuario en res.locals.user
    const { user } = res.locals as { user: { id: number; teamId?: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }
    
    // Se obtiene el teamId, que puede venir desde el objeto de usuario o como parámetro
    const teamId: number = user.teamId ?? (req.body.teamId as number);
    if (!teamId) {
      res.status(httpStatus.badRequest).json({ error: 'No se encontró equipo asociado al usuario' });
      return;
    }
    
    const { formation, round } = req.body as { formation: string; round: Round };
    if (!formation || !round) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros (formation y/o round)' });
      return;
    }
    
    // Crea (o retorna) el draft para el equipo y la ronda especificada.
    const tempDraft: TempPlantilla = await createDraftForRound(teamId, formation, round);
    res.status(httpStatus.ok).json({ tempDraft });
  } catch (error: unknown) {
    next(error);
  }
}

/**
 * Actualiza la tempPlantilla.
 * Se espera que en el body se envíen:
 *   - plantillaId: number (ID de la plantilla/draft)
 *   - playerOptions: el array actualizado de PositionOptions (el JSON que se guarda en la tempPlantilla)
 * La actualización solo es posible mientras el draft no esté finalizado.
 */
async function updateDraftController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Se requiere que el usuario esté autenticado.
    const { user } = res.locals as { user: { id: number; teamId?: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }
    
    const { plantillaId, playerOptions } = req.body as { plantillaId: number; playerOptions: PositionOptions[] };
    if (!plantillaId || !playerOptions) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros (plantillaId y playerOptions)' });
      return;
    }
    
    // Actualizar la tempPlantilla si el draft no se ha finalizado.
    await updateTempPlantilla(plantillaId, playerOptions);
    res.status(httpStatus.ok).json({ message: 'Draft actualizado correctamente' });
  } catch (error: unknown) {
    next(error);
  }
}

/**
 * Guarda la selección final del draft.
 * Se espera en el body que se envíe el objeto tempDraft completo (TempPlantilla) con la selección final
 * (en cada grupo de PositionOptions el quinto elemento debe tener un valor numérico definido, 0 a 3).
 * Una vez guardado, se insertan las relaciones en la tabla plantilla_jugadores y se marca el draft como finalizado.
 */
async function saveDraftController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Verifica que el usuario esté autenticado
    const { user } = res.locals as { user: { id: number; teamId?: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }
    
    const { tempDraft } = req.body as { tempDraft: TempPlantilla };
    if (!tempDraft?.id_plantilla || !tempDraft?.playerOptions) {
      res.status(httpStatus.badRequest).json({ error: 'Faltan parámetros en tempDraft' });
      return;
    }
    
    // Guardar la selección final: inserta la relación y marca el draft como finalizado.
    await saveDraftSelection(tempDraft);
    res.status(httpStatus.ok).json({ message: 'Draft guardado y finalizado correctamente' });
  } catch (error: unknown) {
    next(error);
  }
}

async function getDraftController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Se asume que el middleware de autenticación coloca en res.locals.user los datos del usuario.
    const { user } = res.locals as { user: { id: number; teamId?: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: "Usuario no autenticado" });
      return;
    }

    // El teamId se obtiene del usuario (o opcionalmente del query)
    const teamId: number = user.teamId ?? Number(req.query.teamId);
    if (!teamId) {
      res
        .status(httpStatus.badRequest)
        .json({ error: "No se encontró equipo asociado al usuario" });
      return;
    }

    // El parámetro roundName es opcional; si no se envía se usará la jornada actual en el servicio.
    const roundName = req.query.roundName as string | undefined;

    // Se llama al servicio que obtiene la plantilla (draft) y los jugadores; la temporada se obtiene internamente.
    const { plantilla, players } = await getPlantillaWithPlayers(teamId, roundName);
    res.status(httpStatus.ok).json({ plantilla, players });
  } catch (error: unknown) {
    next(error);
  }
}

export { createDraftController, updateDraftController, saveDraftController, getDraftController };