import admin from 'firebase-admin';
import { getFcmUserTokenService } from './userService.js';

/* Enviar notificación FCM a un token específico */
export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
) {
  const message: admin.messaging.Message = {
    token: fcmToken,

    /* 👇 Esto hace que Android la muestre aunque la app esté “kill-ed” */
    android: {
      priority: "high",
      notification: {
        channelId: "general",   // 🔸 debe existir en la app
        sound: "default",
      },
    },

    notification: { title, body },
  };

  return admin.messaging().send(message);
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