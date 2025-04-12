import * as cron from 'node-cron';
import axios from 'axios';
import { 
  updateJornadaService, 
  getCurrentJornada, 
  insertJornadasIfNotExist, 
  seasonExists, 
  insertSeason,
  getAllJornadas,
  getNextJornada
} from '../../services/jornadaSupaService.js';
import { getTeamsByCurrentSeason, uploadTeamsToSupabase } from '../../services/teamService.js';
import { uploadJugadorEquipoSeasonRelation, uploadPlayersToSupabase, getAllPlayersFromTeams } from '../../services/playerService.js';
import { getRoundsBySeasonId, getCurrentSeasonId } from '../../services/fixturesService.js';
import type Round from '../../types/Round.js';
import { uploadRoundFantasyPoints } from '../../services/jornadaJugadorService.js';
import type { Server as SocketIOServer } from "socket.io";
import { createGlobalNotification } from '../../services/notificacionesService.js';

// URL Base de la API Sportmonks
// eslint-disable-next-line @typescript-eslint/naming-convention
const SPORTMONKS_API_BASE = 'http://localhost:3000/api/v1/sportmonks';

/**
 * Obtiene el season_id actual y verifica si es diferente al almacenado en la BD.
 * Solo si es nuevo, actualiza/inserta TODAS las jornadas de la temporada en Supabase.
 */
const updateJornadasTeamsPlayers = async () => {
  try {
    console.log('⏳ Buscando la temporada actual...');

    // 1. Obtener el season_id actual desde la API
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      console.error('❌ No se pudo obtener el season_id.');
      return;
    }

    // (OPCIONAL) Verificación e inserción de la temporada y jornadas, si quisieras activarlo en otro momento:
      const seasonExistsInDb = await seasonExists(seasonId);
      if (seasonExistsInDb) {
        console.log(`🔄 La temporada ${seasonId} ya está en la base de datos. No se actualizarán las jornadas.`);
        return;
      }

      await insertSeason(seasonId, new Date().toISOString());
      console.log(`✅ Nueva temporada ${seasonId} insertada en la base de datos.`);

      const jornadas = await getRoundsBySeasonId(seasonId);
      if (!jornadas || jornadas.length === 0) {
        console.warn('⚠️ No se encontraron jornadas para la temporada actual.');
        return;
    }

    await insertJornadasIfNotExist(jornadas);
    console.log(`✅ Se han insertado o actualizado ${jornadas.length} jornadas en la base de datos.`);
  
    // 2. Obtener equipos de la temporada actual y subirlos a Supabase
    const equipos = await getTeamsByCurrentSeason();
    await uploadTeamsToSupabase(equipos);

    // 3. Obtener todos los jugadores de todos los equipos
    const jugadores = await getAllPlayersFromTeams();
    if (!jugadores) {
      console.warn('⚠️ No se pudieron obtener los jugadores de los equipos.');
      return;
    }

    // 4. Subir jugadores a la tabla "jugadores"
    await uploadPlayersToSupabase(jugadores);

    // 5. Crear la relación en la tabla "jugadores_equipos_season"
    await uploadJugadorEquipoSeasonRelation(jugadores, seasonId);

  } catch (error) {
    console.error('❌ Error al actualizar todas las jornadas:', error);
  }
};


/**
 * Obtiene la jornada actual desde la API y actualiza en Supabase solo el campo `is_current` si ha cambiado.
 */
const updateJornadaJob = async () => {
  try {
    console.log('⏳ Buscando jornada actual desde la API...');

    // Obtener la jornada actual desde Sportmonks
    const response = await axios.get<{ jornadaActual: Round }>(`${SPORTMONKS_API_BASE}/jornadaActual`);
    if (!response.data?.jornadaActual) {
      console.log('⚠️ No se encontró ninguna jornada actual en la API.');
      return;
    }

    const newJornada = response.data.jornadaActual;

    // Obtener la jornada actual en Supabase
    const currentJornada = await getCurrentJornada();
    if (currentJornada && currentJornada.id === newJornada.id) {
      console.log(`🔄 La jornada con ID ${newJornada.id} ya es la actual. No se realizan cambios.`);
      return;
    }

    // Actualizar solo `is_current` en la BD sin duplicar la jornada
    const updatedJornada = await updateJornadaService(newJornada);
    if (updatedJornada) {
      console.log(`✅ Jornada actualizada: ID ${newJornada.id}, Número ${newJornada.name}`);
    } else {
      console.warn('⚠️ No se pudo actualizar la jornada actual en Supabase.');
    }
  } catch (error) {
    console.error('❌ Error al actualizar la jornada:', error);
  }
};


const executeFantasyPointsJob = async () => {
  try {
    console.log('⏳ Ejecutando carga de puntos fantasy desde jornada 1 hasta actual...');

    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      console.warn('⚠️ No se pudo obtener el season_id actual.');
      return;
    }

    const allJornadas = await getAllJornadas(seasonId);

    if (!allJornadas || allJornadas.length === 0) {
      console.warn('⚠️ No se encontraron jornadas para esta temporada.');
      return;
    }

    const currentJornada = allJornadas.find(jornada => jornada.is_current);

    if (!currentJornada) {
      console.warn('⚠️ No se encontró jornada actual.');
      return;
    }

    const currentRoundNumber = parseInt(currentJornada.name, 10);

    // Filtra solo las jornadas desde la primera hasta la actual, ordenadas numéricamente
    const jornadasHastaActual = allJornadas
      .filter(j => parseInt(j.name, 10) <= currentRoundNumber)
      .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10));

    for (const jornada of jornadasHastaActual) {
      try {
        console.log(`📍 Procesando puntos fantasy para la jornada ${jornada.name} (ID real: ${jornada.id})...`);
        // eslint-disable-next-line no-await-in-loop
        const results = await uploadRoundFantasyPoints(jornada.id);

        if (results.length === 0) {
          console.warn(`⚠️ La jornada ${jornada.name} no devolvió puntos fantasy.`);
        } else {
          console.log(`✅ Puntos fantasy para jornada ${jornada.name} actualizados.`);
        }

      } catch (error: any) {
        console.error(`❌ Error procesando jornada ${jornada.name} (ID ${jornada.id}):`, error.response?.data ?? error.message);
      }
    }

    console.log('✅ Todos los puntos fantasy han sido actualizados exitosamente.');

  } catch (error) {
    console.error('❌ Error al ejecutar el job de puntos fantasy:', error);
  }
};

/**
 * Verifica si hoy es el último día de la jornada actual y, en ese caso,
 * obtiene la siguiente jornada (asumiendo que su id es el actual + 1) y
 * envía una notificación global informando que se abre el plazo para crear los drafts
 * hasta el inicio (starting_at) de la siguiente jornada.
 */
export async function notifyDraftOpeningAt6am(): Promise<void> {
  try {
    console.log("⏳ [notifyDraftOpeningAt6am] Verificando si hoy es el último día de la jornada actual...");

    // Obtener la jornada actual (se asume que getCurrentJornada ya está implementada)
    const currentRound: Round | undefined = await getCurrentJornada();
    if (!currentRound) {
      console.warn("⚠️ [notifyDraftOpeningAt6am] No se encontró la jornada actual");
      return;
    }

    // Comprobar si hoy es el último día de la jornada actual comparando solo año, mes y día.
    const today = new Date();
    const endingAt = new Date(currentRound.ending_at);
    const isLastDay =
      today.getFullYear() === endingAt.getFullYear() &&
      today.getMonth() === endingAt.getMonth() &&
      today.getDate() === endingAt.getDate();

    if (!isLastDay) {
      console.log("🔄 [notifyDraftOpeningAt6am] Hoy no es el último día de la jornada actual; no se envía notificación.");
      return;
    }

    // Obtener la siguiente jornada (se asume que getNextJornada ya está implementada y que la siguiente tiene id = current.id + 1)
    const nextRound: Round | undefined = await getNextJornada();
    if (!nextRound) {
      console.warn("⚠️ [notifyDraftOpeningAt6am] No se encontró la siguiente jornada (id = currentJornada.id + 1)");
      return;
    }

    const nextStartDate = new Date(nextRound.starting_at);
    const formattedDate = nextStartDate.toLocaleDateString();
    const mensaje = `Ya se abre el plazo para crear los drafts hasta el ${formattedDate}`;

    // Crear la notificación global
    const notification = await createGlobalNotification(mensaje);

    // Obtener la instancia de Socket.io (suponiendo que está guardada en global.app.locals.io)
    const io = (global as any).app?.locals?.io as SocketIOServer | undefined;
    if (io) {
      io.emit("notification", notification);
      console.log("✅ [notifyDraftOpeningAt6am] Notificación global enviada:", mensaje);
    } else {
      console.warn("⚠️ [notifyDraftOpeningAt6am] No se encontró la instancia de Socket.io");
    }
  } catch (error: any) {
    console.error("❌ [notifyDraftOpeningAt6am] Error:", error);
  }
}




/**
 * Inicia el cron job:
 *   - Cada 1 minuto: Verifica si hay una nueva temporada y actualiza TODAS las jornadas de la temporada en Supabase.
 *   - Cada 30 segundos: Verifica si la jornada actual ha cambiado y actualiza el campo `is_current`.
 */
const startJornadaCronJob = () => {
  cron.schedule('*/30 * * * * *', () => {
    void updateJornadaJob();
  });

  cron.schedule('*/1 * * * *', () => {
    void updateJornadasTeamsPlayers();
  });

  cron.schedule('*/45 * * * * *', () => {
    console.log('🔄 Cron job de actualización de puntos fantasy iniciado cada 5h...');
    void executeFantasyPointsJob();
  });

  // Programa el cron job para que se ejecute a las 6:00 AM diariamente.
  cron.schedule("0 6 * * *", () => {
    void notifyDraftOpeningAt6am();
    console.log("🔄 Cron job ejecutado a las 6:00 AM");
  });

  console.log('🔄 Cron job de actualización de jornadas iniciado...');
};

export { startJornadaCronJob };
