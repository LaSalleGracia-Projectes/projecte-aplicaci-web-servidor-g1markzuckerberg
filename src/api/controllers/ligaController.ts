/* eslint-disable @typescript-eslint/naming-convention */
import { type Request, type Response, type NextFunction } from 'express';
import { createLigaService, findLigaByCodeService } from '../../services/ligaSupaService.js';
import { getCurrentJornada } from '../../services/jornadaSupaService.js';
import type Liga from '../../types/Liga.js';
import httpStatus from '../config/httpStatusCodes.js';

/**
 * Crear una nueva liga.
 * Se obtiene la jornada actual, se usa el correo del usuario autenticado y se
 * asigna el número de jornada actual (del campo "name") a created_jornada.
 */
const createLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name: string };

    // Verificar que el usuario esté autenticado
    const user = res.locals.user as { correo: string } | undefined;
    if (!user?.correo) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }

    // Obtener la jornada actual
    const currentJornada = await getCurrentJornada();
    if (!currentJornada) {
      return res.status(httpStatus.internalServerError).send({ error: 'No se pudo obtener la jornada actual' });
    }

    const newLiga: Liga = {
      id: 0, // Se genera automáticamente en la BD
      name,
      jornada_id: currentJornada.id,
      created_by: user.correo,
      created_jornada: Number(currentJornada.name), // Guarda el número de la jornada
      code: '', // Se generará en el servicio
    };

    const ligaCreated = await createLigaService(newLiga);
    if (!ligaCreated) {
      return res.status(httpStatus.internalServerError).send({ error: 'No se pudo crear la liga' });
    }

    res.status(httpStatus.created).send({ liga: ligaCreated });
  } catch (error) {
    next(error);
  }
};

/**
 * Unirse a una liga por código (requiere autenticación)
 */
const joinLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ligaCode } = req.params;
    const liga = await findLigaByCodeService(ligaCode);

    if (!liga) {
      return res.status(httpStatus.notFound).send({ error: 'Liga no encontrada' });
    }

    res.status(httpStatus.ok).send({ message: 'Liga encontrada', liga });
  } catch (error) {
    next(error);
  }
};

export { createLiga, joinLiga };
