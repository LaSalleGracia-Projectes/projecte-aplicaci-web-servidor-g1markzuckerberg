import httpStatus from '../config/httpStatusCodes.js';
import type { Request, Response, NextFunction } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import { createNotificationForUser, createGlobalNotification, getNotificationsByUserId } from '../../services/notificacionesService.js';
import { getFcmUserTokenService, pushFcmUserTokenService } from '../../services/userService.js';
import type Notificacion from '../../types/Notificaciones.js';
import { getLigaByIdService } from '../../services/ligaSupaService.js';
import type UserI from '../../types/UserI.js';

/**
 * Crea una notificación para un usuario específico y emite el evento a través de socket.io.
 * Se espera en el body:
 * {
 *   "mensaje": "Has sido expulsado de la liga X",
 *   "userId": 123
 * }
 */
async function sendUserNotificationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mensaje, userId } = req.body as { mensaje: string; userId: number };
    if (!mensaje || !userId) {
      res.status(httpStatus.badRequest).json({ error: "Faltan parámetros" });
      return;
    }

    const notification: Notificacion = await (createNotificationForUser as (mensaje: string, userId: number) => Promise<Notificacion>)(mensaje, userId);
    // Obtener la instancia de socket.io (asumida en req.app.locals.io)
    const { io } = req.app.locals as { io?: SocketIOServer };
    if (io) {
      // Emitir la notificación a un room específico para el usuario, por ejemplo "user_123".
      io.to(`user_${userId}`).emit("notification", notification);
    }
    
    res.status(httpStatus.ok).json({ notification });
  } catch (error: unknown) {
    next(error);
  }
}

/**
 * Crea una notificación global y la emite a todos los clientes conectados.
 * Se espera en el body:
 * {
 *   "mensaje": "El draft está abierto"
 * }
 */
async function sendGlobalNotificationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mensaje } = req.body as { mensaje: string };
    if (!mensaje) {
      res.status(httpStatus.badRequest).json({ error: "Falta el mensaje" });
      return;
    }

    // Crear la notificación global en la base de datos.
    const notification = await createGlobalNotification(mensaje);
    // Obtener la instancia de socket.io.
    const { io } = req.app.locals as { io?: SocketIOServer };
    if (io) {
      io.emit("notification", notification);
    }

    res.status(httpStatus.ok).json({ notification });
  } catch (error: unknown) {
    next(error);
  }
}

/**
 * Ejemplo de ruta: GET /api/v1/notificaciones
 * No se reciben parámetros en la URL; se toma el userId de res.locals.user.
 * Obtiene las notificaciones (tanto las específicas del usuario como las globales) 
 * ordenadas por fecha descendiente.
 */
async function getNotificationsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user } = res.locals as { user: { id: number } };
    if (!user?.id) {
      res.status(httpStatus.unauthorized).json({ error: 'Usuario no autenticado' });
      return;
    }

    const notifications = await getNotificationsByUserId(user.id);
    res.status(httpStatus.ok).json({ notifications });
  } catch (error: unknown) {
    next(error);
  }
}

/** 🔹 Guardar o actualizar el FCM token */
async function pushFcmTokenController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user } = res.locals as { user: { id: number } };
    const { fcmToken } = req.body as { fcmToken: string };
    if (!fcmToken) {
      res.status(httpStatus.badRequest).json({ error: "Falta el token" });
      return;
    }

    const success = await pushFcmUserTokenService(user.id, fcmToken);
    if (success) {
      res.status(httpStatus.ok).json({ message: "Token actualizado" });
    } else {
      res.status(httpStatus.internalServerError).json({ error: "No se pudo actualizar el token" });
    }
  } catch (error: unknown) {
    next(error);
  }
}

/** 🔹 Obtener el FCM token de un usuario por id */
async function getFcmTokenController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      res.status(httpStatus.badRequest).json({ error: "ID inválido" });
      return;
    }

    const token = await getFcmUserTokenService(userId);
    if (token) {
      res.status(httpStatus.ok).json({ fcmToken: token });
    } else {
      res.status(httpStatus.notFound).json({ error: "Token no encontrado" });
    }
  } catch (error: unknown) {
    next(error);
  }
}

export { sendUserNotificationController, sendGlobalNotificationController, getNotificationsController,
  pushFcmTokenController, getFcmTokenController };