import { sql } from "./supabaseService.js";
import type Notificacion from "../types/notificaciones.js";

// Ajusta si tienes un archivo con la definición de la tabla 'notificaciones'.
import { notificacionesTable } from "../models/Notificaciones";

/**
 * Crea una notificación para un usuario específico (usuario_id).
 * Por ejemplo, cuando un usuario es expulsado de una liga, 
 * se le podría enviar "Has sido expulsado de la liga X".
 *
 * @param mensaje - Texto del mensaje.
 * @param userId - ID del usuario al que se le envía la notificación.
 * @returns El objeto Notificacion creado.
 */
export async function createNotificationForUser(
  mensaje: string,
  userId: number
): Promise<Notificacion> {
  const [inserted] = await sql<Notificacion[]>`
    INSERT INTO ${sql(notificacionesTable)} (mensaje, usuario_id, is_global)
    VALUES (${mensaje}, ${userId}, false)
    RETURNING id, mensaje, usuario_id, is_global, created_at
  `;
  return inserted;
}

/**
 * Crea una notificación global (is_global = true), 
 * por ejemplo para anunciar a todos los usuarios que pueden hacer el draft.
 *
 * @param mensaje - Texto del mensaje que se enviará de forma global.
 * @returns El objeto Notificacion creado.
 */
export async function createGlobalNotification(mensaje: string): Promise<Notificacion> {
  const [inserted] = await sql<Notificacion[]>`
    INSERT INTO ${sql(notificacionesTable)} (mensaje, is_global)
    VALUES (${mensaje}, true)
    RETURNING id, mensaje, usuario_id, is_global, created_at
  `;
  return inserted;
}