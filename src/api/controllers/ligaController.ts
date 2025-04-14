/* eslint-disable @typescript-eslint/naming-convention */
import { type Request, type Response, type NextFunction } from 'express';
import { createLigaService, findLigaByCodeService, addUserToLigaService,
  getUsersByLigaService, isUserInLigaService, getLigaCodeByIdService, removeUserFromLigaService,
  assignNewCaptainService, abandonLigaService, getUserFromLeagueByIdService,
  getLigaByIdService, updateLigaNameService } from '../../services/ligaSupaService.js';
import { getCurrentJornada, getJornadaByName } from '../../services/jornadaSupaService.js';
import type Liga from '../../types/Liga.js';
import httpStatus from '../config/httpStatusCodes.js';
import { sql } from '../../services/supabaseService.js';
import path from 'path';
import { usuariosLigasTable } from '../../models/LigaUsuario.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createNotificationForUser } from '../../services/notificacionesService.js';
import type { Server as SocketIOServer } from "socket.io";
import { getUserByIdService } from '../../services/userService.js';


/**
 * **Crear una nueva liga.**
 * - Se obtiene la jornada actual.
 * - Se usa el correo del usuario autenticado como `created_by`.
 * - Se guarda el número de jornada en `created_jornada`.
 * - **El usuario que crea la liga se une automáticamente como capitán.**
 */
/**
 * Crea una liga. Además, envía una notificación al usuario creador.
 * Ejemplo de body:
 * {
 *   "name": "Liga Ejemplo"
 * }
 */
const createLiga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body as { name: string };

    // Verificar autenticación del usuario
    const user = res.locals.user as { id: number; correo: string; teamId?: number };
    if (!user?.correo || !user?.id) {
      res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
      return;
    }

    // Obtener la jornada actual (para asociarla a la liga)
    const currentJornada = await getCurrentJornada();
    if (!currentJornada) {
      res.status(httpStatus.internalServerError).send({ error: 'No se pudo obtener la jornada actual' });
      return;
    }

    // Crear la liga (se asume que createLigaService retorna un objeto Liga)
    const newLiga: Liga = {
      id: 0, // Se genera automáticamente en la BD
      name,
      jornada_id: currentJornada.id,
      created_by: user.correo,
      created_jornada: Number(currentJornada.name),
      code: '' // Se generará según la lógica interna
    };

    const ligaCreated = await createLigaService(newLiga);
    if (!ligaCreated) {
      res.status(httpStatus.internalServerError).send({ error: 'No se pudo crear la liga' });
      return;
    }

    // El usuario que crea la liga se une automáticamente como capitán.
    const added = await addUserToLigaService(user.id, ligaCreated.id, true);
    if (!added) {
      res.status(httpStatus.internalServerError).send({ error: 'Error al unirse a la liga' });
      return;
    }

    // Crear notificación para el usuario creador.
    const notificationMessage = `Has creado la liga ${ligaCreated.name} correctamente`;
    const notification = await createNotificationForUser(notificationMessage, user.id);

    // Emisión mediante socket.io (suponiendo que la instancia está en req.app.locals.io).
    const { io } = req.app.locals as { io?: SocketIOServer };
    if (io) {
      io.to(`user_${user.id}`).emit("notification", notification);
    }

    res.status(httpStatus.created).send({
      message: 'Liga creada y usuario añadido como capitán',
      liga: ligaCreated
    });
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Permite a un usuario unirse a una liga por su código.
 * Envía una notificación al usuario confirmándole que se ha unido a la liga.
 * Ejemplo: se pasa ligaCode en los parámetros (req.params).
 */
const joinLiga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ligaCode } = req.params;

    // Verificar autenticación del usuario
    const user = res.locals.user as { id: number; correo: string; teamId?: number };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
      return;
    }

    // Buscar la liga (se asume que findLigaByCodeService existe)
    const liga = await findLigaByCodeService(ligaCode);
    if (!liga) {
      res.status(httpStatus.notFound).send({ error: 'Liga no encontrada' });
      return;
    }

    // Agregar el usuario a la liga (como miembro, no capitan)
    const joined = await addUserToLigaService(user.id, liga.id, false);
    if (!joined) {
      res.status(httpStatus.internalServerError).send({ error: 'No se pudo unir a la liga' });
      return;
    }

    // Crear notificación para indicar que se ha unido a la liga.
    const notificationMessage = `Te has unido a la liga ${liga.name} con éxito`;
    const notification = await createNotificationForUser(notificationMessage, user.id);

    // Emitir notificación mediante socket.io.
    const { io } = req.app.locals as { io?: SocketIOServer };
    if (io) {
      io.to(`user_${user.id}`).emit("notification", notification);
    }

    res.status(httpStatus.ok).send({
      message: 'Te has unido a la liga con éxito',
      liga
    });
  } catch (error: unknown) {
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

    // Verificar autenticación del usuario
    const user = res.locals.user as { id: number };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).json({ error: 'No autorizado' });
    }

    // Buscar la liga por código
    const liga = await findLigaByCodeService(ligaCode);
    if (!liga) {
      return res.status(httpStatus.notFound).json({ error: 'Liga no encontrada' });
    }

    // Verificar si el usuario está en la liga
    const isUserInLiga = await isUserInLigaService(user.id, liga.id);
    if (!isUserInLiga) {
      return res.status(httpStatus.unauthorized).json({ error: 'No estás unido a esta liga' });
    }

    // Obtener usuarios de la liga (según el código y, opcionalmente, la jornada)
    const result = await getUsersByLigaService(ligaCode, jornada);

    // Procesar cada registro para agregar la URL de la imagen de perfil
    const typedUsers = (result.users as unknown) as Array<{ [key: string]: any; id: number }>;
    const usersWithImage = typedUsers.map((userRecord) => ({
      ...userRecord,
      imageUrl: `/api/v1/user/get-image?userId=${userRecord.id}`
    }));

    // Retornar la información de la liga, la lista de usuarios con imagen y la jornada consultada
    res.status(httpStatus.ok).json({
      liga: result.liga,
      users: usersWithImage,
      jornada_id: result.jornada_id
    });
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
 * Ruta: DELETE /api/v1/ligas/:ligaId/user/:userId
 * 
 * Además, se envía:
 * - Al capitán: "Has expulsado a [usuario] de la liga [nombre]".
 * - Al usuario expulsado: "Has sido expulsado de la liga [nombre]".
 */
const removeUserFromLiga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // El ID del usuario que realiza la acción (capitán) se obtiene desde res.locals.
    const capitan = res.locals.user as { id: number };
    if (!capitan?.id) {
      res.status(httpStatus.unauthorized).send({ error: 'No autorizado' });
      return;
    }

    // Extraer los parámetros: ligaId y userId (del usuario a eliminar).
    const { ligaId, userId } = req.params;
    const leagueId = Number(ligaId);
    const userIdToRemove = Number(userId);
    if (isNaN(leagueId) || isNaN(userIdToRemove)) {
      res.status(httpStatus.badRequest).send({ error: 'IDs inválidos' });
      return;
    }

    // Llamar al servicio para eliminar el usuario de la liga.
    await removeUserFromLigaService(capitan.id, leagueId, userIdToRemove);

    // Obtener datos de la liga y del usuario expulsado.
    const liga = await getLigaByIdService(leagueId);
    if (!liga) {
      res.status(httpStatus.notFound).send({ error: 'Liga no encontrada' });
      return;
    }

    const expulsado = await getUserByIdService(userIdToRemove.toString());

    // Preparar los mensajes de notificación.
    const mensajeCapitan = `Has expulsado a ${expulsado.username ?? expulsado.correo} de la liga ${liga.name}`;
    const mensajeExpulsado = `Has sido expulsado de la liga ${liga.name}`;

    // Crear las notificaciones en la base de datos.
    const notiCapitan = await createNotificationForUser(mensajeCapitan, capitan.id);
    const notiExpulsado = await createNotificationForUser(mensajeExpulsado, userIdToRemove);

    // Obtener la instancia de socket.io y emitir los eventos.
    const { io } = req.app.locals as { io?: SocketIOServer };
    if (io) {
      // Enviar notificación al capitán.
      io.to(`user_${capitan.id}`).emit("notification", notiCapitan);
      // Enviar notificación al usuario expulsado.
      io.to(`user_${userIdToRemove}`).emit("notification", notiExpulsado);
    }

    res.status(httpStatus.ok).send({ message: "Usuario eliminado de la liga correctamente" });
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

const uploadLeagueImageByCaptainController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ligaId } = req.params;
    const user = res.locals.user as { id: number };

    if (!user?.id) {
      return res.status(httpStatus.unauthorized).json({ error: 'No autorizado' });
    }
    
    // Verificar que el usuario sea capitán de la liga
    const [captainRecord] = await sql`
      SELECT is_capitan FROM ${sql(usuariosLigasTable)}
      WHERE usuario_id = ${user.id} AND liga_id = ${ligaId}
      LIMIT 1;
    `;
    
    if (!captainRecord?.is_capitan) {
      return res.status(httpStatus.badRequest).json({ error: 'Solo el capitán puede actualizar la imagen de la liga' });
    }
    
    if (!req.file) {
      return res.status(httpStatus.badRequest).json({ error: 'No se ha subido ninguna imagen.' });
    }
    
    // Construir la URL relativa de la imagen
    const imageUrl = `/img/ligas/leagueImage${ligaId}${path.extname(req.file.originalname)}`;
    
    res.status(httpStatus.ok).json({
      message: 'Imagen de liga actualizada correctamente.',
      imageUrl
    });
  } catch (error) {
    next(error);
  }
};

const getLeagueImageController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ligaId } = req.params;
    if (!ligaId) {
      return res.status(400).json({ error: 'No se proporcionó el ID de la liga.' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const imageDir = path.join(__dirname, '../../../public/img/ligas');

    const files = fs.readdirSync(imageDir);
    const imageFile = files.find(fileName => fileName.startsWith(`leagueImage${ligaId}`));

    const imagePath = imageFile
      ? path.join(imageDir, imageFile)
      : path.join(imageDir, 'defaultLeague.png'); // Fallback

    res.sendFile(imagePath);
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener la información de un usuario dentro de una liga.
 * Se espera que en la URL se envíen:
 *   - leagueId: ID de la liga.
 *   - userId: ID del usuario.
 *
 * La respuesta incluye la información del usuario (username, birthDate),
 * los datos de la relación en la liga (puntos_totales, is_capitan) y
 * la URL de su imagen de perfil.
 */
const getUserFromLeagueController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leagueId, userId } = req.params;
    const parsedLeagueId = Number(leagueId);
    const parsedUserId = Number(userId);
    
    if (isNaN(parsedLeagueId) || isNaN(parsedUserId)) {
      return res.status(httpStatus.badRequest).json({ error: 'ID inválido' });
    }
    
    // Se asume que la autenticación y verificación de membresía se realizan en middleware
    const userRecord = await getUserFromLeagueByIdService(parsedLeagueId, parsedUserId);
    
    // Agregar la URL de la imagen de perfil (ej: /api/v1/user/get-image?userId=<ID>)
    const userWithImage = {
      ...userRecord,
      imageUrl: `/api/v1/user/get-image?userId=${userRecord.id}`
    };
    
    res.status(httpStatus.ok).json({ user: userWithImage });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para actualizar el nombre de una liga.
 * Solo el capitán (identificado por su correo en `created_by`) puede actualizar el nombre.
 *
 * Ruta sugerida: PATCH /api/v1/ligas/:ligaId/name
 *
 * Ejemplo de body:
 * {
 *   "newName": "Nuevo Nombre de Liga"
 * }
 */
const updateLigaNameController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verificar autenticación del usuario
    const user = res.locals.user as { id: number; correo: string };
    if (!user?.correo) {
      res.status(httpStatus.unauthorized).json({ error: 'No autorizado' });
      return;
    }
    
    // Extraer el ID de la liga desde los parámetros de la URL
    const { ligaId } = req.params;
    const id = Number(ligaId);
    if (isNaN(id)) {
      res.status(httpStatus.badRequest).json({ error: 'ID de liga inválido' });
      return;
    }
    
    // Extraer el nuevo nombre de la liga desde el body
    const { newName } = req.body as { newName: string };
    if (!newName) {
      res.status(httpStatus.badRequest).json({ error: 'Nuevo nombre no proporcionado' });
      return;
    }
    
    // Llamar al servicio para actualizar el nombre de la liga.
    // Este servicio verifica que el usuario sea el capitán comparando el email.
    const updatedLiga = await updateLigaNameService(id, newName, user.correo);
    if (!updatedLiga) {
      res.status(httpStatus.internalServerError).json({ error: 'No se pudo actualizar la liga' });
      return;
    }
    
    res.status(httpStatus.ok).json({
      message: 'Liga actualizada correctamente',
      liga: updatedLiga
    });
  } catch (error) {
    next(error);
  }
};

export { createLiga, joinLiga, getUsersByLiga, getLigaCodeById, removeUserFromLiga,
  assignNewCaptain, abandonLiga, uploadLeagueImageByCaptainController, getLeagueImageController,
  getUserFromLeagueController, updateLigaNameController };


