import admin from 'firebase-admin';
import { getFcmUserTokenService } from './userService.js';

/* Enviar notificación FCM a un token específico */
export async function sendPushNotification(fcmToken: string, title: string, body: string) {
  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      token: fcmToken,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const response: string = await admin.messaging().send(message);
    console.log("✅ FCM mensaje enviado:", response);
    return response;
  } catch (error) {
    console.error("❌ Error enviando FCM:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function sendFcmNotificationToUser(userId: number, title: string, body: string) {
  try {
    const fcmToken = await getFcmUserTokenService(userId);
    if (!fcmToken) {
      console.warn(`⚠️ No se encontró FCM token para el usuario ${userId}.`);
      return;
    }

    await sendPushNotification(fcmToken, title, body);
  } catch (error) {
    console.error(`❌ Error enviando notificación FCM al usuario ${userId}:`, error);
  }
}