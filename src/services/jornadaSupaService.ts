import { sql } from './supabaseService.js';
import { jornadaTable } from '../models/Jornada.js';
import type Round from '../types/Round.js';

/**
 * Obtiene la jornada actual (la que tiene is_current = true).
 */
export const getCurrentJornada = async (): Promise<Round | undefined> => {
  const [currentJornada] = await sql<Round[]>`
    SELECT * FROM ${sql(jornadaTable)} WHERE is_current = TRUE LIMIT 1;
  `;
  return currentJornada ?? null;
};

/**
 * Crea una nueva jornada y actualiza la jornada actual en Supabase.
 */
export const createJornadaService = async (jornada: Round): Promise<Round | undefined> => {
  // Desactivar la jornada actual anterior
  await sql`
    UPDATE ${sql(jornadaTable)}
    SET is_current = FALSE
    WHERE is_current = TRUE;
  `;

  // Insertar la nueva jornada con is_current = TRUE
  const [newJornada] = await sql<Round[]>`
    INSERT INTO ${sql(jornadaTable)} (id, name, season_id, is_current)
    VALUES (${jornada.id}, ${jornada.name}, ${jornada.season_id}, TRUE)
    RETURNING *;
  `;
  return newJornada ?? null;
};
