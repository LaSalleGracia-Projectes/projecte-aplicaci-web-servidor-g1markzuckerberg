import { sql } from './supabaseService.js';
import { jornadaTable } from '../models/Jornada.js';
import { seasonsTable } from '../models/Seasons.js';
import type Round from '../types/Round.js';
import type Season from '../types/Season.js';

/**
 * Obtiene la jornada actual (is_current = true).
 */
export const getCurrentJornada = async (): Promise<Round | undefined> => {
  try {
    const [currentJornada] = await sql<Round[]>`
      SELECT * FROM ${sql(jornadaTable)}
      WHERE is_current = TRUE
      LIMIT 1;
    `;
    return currentJornada ?? null;
  } catch (error) {
    console.error(`❌ Error al obtener la jornada actual:`, error);
    throw new Error(`Database error while fetching current jornada`);
  }
};

/**
 * Verifica si la temporada ya existe en la base de datos.
 */
export const seasonExists = async (seasonId: number): Promise<boolean> => {
  try {
    const [existingSeason] = await sql<Season[]>`
      SELECT id FROM ${sql(seasonsTable)}
      WHERE id = ${seasonId}
      LIMIT 1;
    `;
    return Boolean(existingSeason);
  } catch (error) {
    console.error(`❌ Error al verificar la temporada en la base de datos:`, error);
    throw new Error(`Database error while checking season existence`);
  }
};

/**
 * Inserta una nueva temporada en la base de datos si no existe.
 */
export const insertSeason = async (seasonId: number, createdAt: string): Promise<boolean> => {
  try {
    await sql`
      INSERT INTO ${sql(seasonsTable)} (id, created_at)
      VALUES (${seasonId}, ${createdAt})
      ON CONFLICT (id) DO NOTHING;
    `;
    console.log(`✅ Temporada ${seasonId} insertada correctamente con created_at = ${createdAt}.`);
    return true;
  } catch (error) {
    console.error(`❌ Error al insertar la temporada en la base de datos:`, error);
    throw new Error(`Database error while inserting season`);
  }
};

/**
 * Actualiza la jornada actual en Supabase sin duplicados.
 * - Desactiva la jornada anterior (`is_current = FALSE`).
 * - Activa la nueva jornada (`is_current = TRUE`).
 */
export const updateJornadaService = async (jornada: Round): Promise<Round | undefined> => {
  try {
    const [existingJornada] = await sql<Round[]>`
      SELECT * FROM ${sql(jornadaTable)}
      WHERE id = ${jornada.id}
      LIMIT 1;
    `;

    if (existingJornada) {
      // Solo actualizar `is_current`, sin duplicar
      await sql`
        UPDATE ${sql(jornadaTable)}
        SET is_current = FALSE
        WHERE is_current = TRUE;
      `;

      await sql`
        UPDATE ${sql(jornadaTable)}
        SET is_current = TRUE
        WHERE id = ${jornada.id};
      `;

      console.log(`✅ Jornada ${jornada.name} marcada como actual.`);
      return jornada;
    }

    console.log(`⚠️ La jornada ${jornada.name} no existe en la base de datos.`);
    return undefined;
  } catch (error) {
    console.error(`❌ Error actualizando la jornada:`, error);
    throw new Error(`Database error while updating jornada`);
  }
};

/**
 * Obtiene una jornada por su `name` (que representa el número de jornada).
 */
export const getJornadaByName = async (name: string): Promise<Round | undefined> => {
  try {
    const [jornada] = await sql<Round[]>`
      SELECT * FROM ${sql(jornadaTable)}
      WHERE name = ${name}
      LIMIT 1;
    `;
    return jornada ?? null;
  } catch (error) {
    console.error(`❌ Error al obtener la jornada por nombre:`, error);
    throw new Error(`Database error while fetching jornada by name`);
  }
};

/**
 * Inserta todas las jornadas en la base de datos si no existen.
 */
export const insertJornadasIfNotExist = async (jornadas: Round[]) => {
  try {
    await Promise.all(
      jornadas.map(async (jornada) =>
        sql`
          INSERT INTO ${sql(jornadaTable)} (id, name, season_id, is_current, starting_at, ending_at)
          VALUES (${jornada.id}, ${jornada.name}, ${jornada.season_id}, ${jornada.is_current}, ${jornada.starting_at}, ${jornada.ending_at})
          ON CONFLICT (id) DO UPDATE 
          SET starting_at = EXCLUDED.starting_at,
              ending_at = EXCLUDED.ending_at;
        `
      )
    );

    console.log(`✅ Jornadas insertadas o actualizadas correctamente.`);
  } catch (error) {
    console.error(`❌ Error al insertar o actualizar jornadas:`, error);
    throw new Error(`Database error while inserting or updating jornadas`);
  }
};
