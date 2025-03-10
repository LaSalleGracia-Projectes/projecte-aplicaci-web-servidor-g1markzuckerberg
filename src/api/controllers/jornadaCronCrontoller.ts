import * as cron from 'node-cron';
import axios from 'axios';
import { 
  updateJornadaService, 
  getCurrentJornada, 
  insertJornadasIfNotExist, 
  seasonExists, 
  insertSeason 
} from '../../services/jornadaSupaService.js';
import { getRoundsBySeasonId, getCurrentSeasonId } from '../../services/fixturesService.js';
import type Round from '../../types/Round.js';

// URL Base de la API Sportmonks
// eslint-disable-next-line @typescript-eslint/naming-convention
const SPORTMONKS_API_BASE = 'http://localhost:3000/api/v1/sportmonks';

/**
 * Obtiene el season_id actual y verifica si es diferente al almacenado en la BD.
 * Solo si es nuevo, actualiza/inserta TODAS las jornadas de la temporada en Supabase.
 */
const updateAllJornadas = async () => {
  try {
    console.log('⏳ Buscando la temporada actual...');

    // Obtener el season_id actual desde la API
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      console.error('❌ No se pudo obtener el season_id.');
      return;
    }

    // Verificar si la temporada ya está en la base de datos
    const seasonExistsInDb = await seasonExists(seasonId);
    if (seasonExistsInDb) {
      console.log(`🔄 La temporada ${seasonId} ya está en la base de datos. No se actualizarán las jornadas.`);
      return;
    }

    // Insertar nueva temporada si no existe
    await insertSeason(seasonId);
    console.log(`✅ Nueva temporada ${seasonId} insertada en la base de datos.`);

    // Obtener todas las jornadas de la temporada actual desde la API
    const jornadas = await getRoundsBySeasonId(seasonId);
    if (!jornadas || jornadas.length === 0) {
      console.warn('⚠️ No se encontraron jornadas para la temporada actual.');
      return;
    }

    // Insertar o actualizar las jornadas en la BD
    await insertJornadasIfNotExist(jornadas);
    console.log(`✅ Se han insertado o actualizado ${jornadas.length} jornadas en la base de datos.`);
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
    void updateAllJornadas();
  });

  console.log('🔄 Cron job de actualización de jornadas iniciado...');
};

export { startJornadaCronJob };
