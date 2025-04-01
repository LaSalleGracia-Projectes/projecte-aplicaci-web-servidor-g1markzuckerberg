/* eslint-disable @typescript-eslint/naming-convention */
import { type Request, type Response, type NextFunction } from 'express';
import { createLigaService, findLigaByCodeService, addUserToLigaService,
  getUsersByLigaService, isUserInLigaService, getLigaCodeByIdService, removeUserFromLigaService,
  assignNewCaptainService, abandonLigaService } from '../../services/ligaSupaService.js';
import { getCurrentJornada, getJornadaByName } from '../../services/jornadaSupaService.js';
import type Liga from '../../types/Liga.js';
import httpStatus from '../config/httpStatusCodes.js';

/**
 * **Crear una nueva liga.**
 * - Se obtiene la jornada actual.
 * - Se usa el correo del usuario autenticado como `created_by`.
 * - Se guarda el número de jornada en `created_jornada`.
 * - **El usuario que crea la liga se une automáticamente como capitán.**
 */
const createLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name: string };

    // ✅ Verificar autenticación del usuario
    const user = res.locals.user as { id: number; correo: string };
    if (!user?.correo || !user?.id) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }

    // ✅ Obtener la jornada actual
    const currentJornada = await getCurrentJornada();
    if (!currentJornada) {
      return res.status(httpStatus.internalServerError).send({ error: 'No se pudo obtener la jornada actual' });
    }

    // ✅ Crear la liga
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

    // ✅ El usuario que crea la liga se une automáticamente como capitán
    const success = await addUserToLigaService(user.id, ligaCreated.id, true);
    if (!success) {
      return res.status(httpStatus.internalServerError).send({ error: 'Error al unirse a la liga' });
    }

    res.status(httpStatus.created).send({ message: 'Liga creada y usuario añadido como capitán', liga: ligaCreated });
  } catch (error) {
    next(error);
  }
};

/**
 * Unirse a una liga por código (requiere autenticación)
 * - Busca la liga por `code`.
 * - Agrega al usuario autenticado en la tabla `usuarios_ligas`.
 */
const joinLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ligaCode } = req.params;
    
    // Verificar autenticación del usuario
    const user = res.locals.user as { id: number; correo: string };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }

    // Buscar la liga
    const liga = await findLigaByCodeService(ligaCode);
    if (!liga) {
      return res.status(httpStatus.notFound).send({ error: 'Liga no encontrada' });
    }

    // Agregar el usuario a la liga (No es capitán)
    const success = await addUserToLigaService(user.id, liga.id, false);
    if (!success) {
      return res.status(httpStatus.internalServerError).send({ error: 'No se pudo unir a la liga' });
    }

    res.status(httpStatus.ok).send({ message: 'Te has unido a la liga con éxito', liga });
  } catch (error) {
    next(error);
  }
};

/**
 * **Obtener usuarios de una liga por código y jornada opcional.**
 * - Busca la liga por `code`.
 * - Si no se proporciona `jornada`, usa la **jornada actual (`is_current = true`)**.
 * - **Si la jornada solicitada es menor que `created_jornada`, devuelve error.**
 * - **Si la jornada solicitada es mayor que la jornada actual, devuelve error.**
 * - Ordena los usuarios por:
 *   1. `puntos_totales` (descendente)
 *   2. `username` (alfabético en caso de empate)
 */
const getUsersByLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ligaCode } = req.params;
    const { jornada } = req.query as { jornada?: string };

    // ✅ Verificar autenticación del usuario
    const user = res.locals.user as { id: number };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }

    // ✅ Buscar la liga por código
    const liga = await findLigaByCodeService(ligaCode);
    if (!liga) {
      return res.status(httpStatus.notFound).send({ error: 'Liga no encontrada' });
    }

    // ✅ Verificar si el usuario está en la liga
    const isUserInLiga = await isUserInLigaService(user.id, liga.id);
    if (!isUserInLiga) {
      return res.status(httpStatus.unauthorized).send({ error: 'No estás unido a esta liga' });
    }

    // ✅ Llamar al servicio para obtener usuarios de la liga
    const data = await getUsersByLigaService(ligaCode, jornada);

    res.status(httpStatus.ok).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener el código de la liga por id.
 * Solo se devuelve si el usuario autenticado es miembro de la liga.
 *
 * Ruta: GET /api/v1/ligas/code/:ligaId
 */
const getLigaCodeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar que el usuario esté autenticado.
    const user = res.locals.user as { id: number };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }
    
    // Extraer el id de la liga desde los parámetros.
    const { ligaId } = req.params;
    const id = Number(ligaId);
    if (isNaN(id)) {
      return res.status(httpStatus.badRequest).send({ error: 'Id de liga inválido' });
    }
    
    // Llamar al servicio para obtener el código de la liga.
    const code = await getLigaCodeByIdService(id, user.id);
    
    // Devolver el código.
    res.status(httpStatus.ok).send({ code });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para eliminar a un usuario de una liga.
 * Solo puede hacerlo el capitán de la liga.
 *
 * Ruta: DELETE /api/v1/ligas/:ligaId/user/:userId
 */
const removeUserFromLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // El ID del usuario que realiza la acción (capitán) se obtiene desde res.locals.
    const capitan = res.locals.user as { id: number };
    if (!capitan?.id) {
      return res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
    }

    // Extraer los parámetros: ligaId y userId (del usuario a eliminar).
    const { ligaId, userId } = req.params;
    const leagueId = Number(ligaId);
    const userIdToRemove = Number(userId);
    if (isNaN(leagueId) || isNaN(userIdToRemove)) {
      return res.status(httpStatus.badRequest).send({ error: 'IDs inválidos' });
    }

    // Llamar al servicio para eliminar el usuario de la liga.
    await removeUserFromLigaService(capitan.id, leagueId, userIdToRemove);

    res.status(httpStatus.ok).send({ message: 'Usuario eliminado de la liga correctamente' });
  } catch (error) {
    next(error);
  }
};

const assignNewCaptain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtenemos el usuario autenticado desde res.locals.
    const user = res.locals.user as { id: number };
    const { ligaId, newCaptainId } = req.params; // Ahora ambos vienen en la URL

    await assignNewCaptainService(user.id, Number(ligaId), Number(newCaptainId));
    res.status(200).json({ message: 'Nuevo capitán asignado correctamente' });
  } catch (error) {
    next(error);
  }
};

const abandonLiga = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user as { id: number };
    const { ligaId } = req.params;

    await abandonLigaService(user.id, Number(ligaId));
    res.status(200).json({ message: 'Has abandonado la liga correctamente' });
  } catch (error) {
    next(error);
  }
};


export { createLiga, joinLiga, getUsersByLiga, getLigaCodeById, removeUserFromLiga, assignNewCaptain, abandonLiga };


