import * as cron from 'node-cron';
import axios from 'axios';
import { createJornadaService, getCurrentJornada } from '../../services/jornadaSupaService.js';
import type Round from '../../types/Round.js';

/**
 * Función que obtiene la jornada actual desde la API y la actualiza en Supabase solo si cambia.
 */
const updateJornadaJob = async () => {
  try {
    console.log('⏳ Buscando jornada actual desde la API...');

    // Obtener la jornada actual desde la API
    const response = await axios.get<{ jornadaActual: Round }>('http://localhost:3000/api/v1/sportmonks/jornadaActual');

    if (response.data?.jornadaActual) {
      const newJornada = response.data.jornadaActual;

      // Obtener la jornada actual en Supabase
      const currentJornada = await getCurrentJornada();

      if (currentJornada && currentJornada.id === newJornada.id) {
        console.log(`🔄 La jornada con ID ${newJornada.id} ya es la actual. No se realizan cambios.`);
        return;
      }

      // Crear nueva jornada en Supabase si ha cambiado
      const updatedJornada = await createJornadaService(newJornada);

      if (updatedJornada) {
        console.log(`✅ Jornada actualizada: ID ${updatedJornada.id}, Número ${updatedJornada.name}`);
      } else {
        console.log('⚠️ No se pudo actualizar la jornada en Supabase.');
      }
    } else {
      console.log('⚠️ No se encontró ninguna jornada actual en la API.');
    }
  } catch (error) {
    console.error('❌ Error al actualizar la jornada:', error);
  }
};

/**
 * Función que inicia el cron job para actualizar la jornada cada 30 segundos.
 */
const startJornadaCronJob = () => {
  cron.schedule('*/30 * * * * *', () => {
    void updateJornadaJob();
  });
  console.log('🔄 Cron job de actualización de jornada iniciado...');
};

export {
  startJornadaCronJob
};
