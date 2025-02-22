import { sql } from './supabaseService.js';
import type Liga from '../types/Liga.js';
import { ligaTable } from '../models/Liga.js';

/**
 * Función para generar un código único de liga (8 caracteres en mayúsculas)
 */
const generateLigaCode = (): string =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

/**
 * Crear una nueva liga en Supabase.
 * Se insertan los campos: name, jornada_id, created_by, created_jornada y code.
 */
const createLigaService = async (liga: Liga): Promise<Liga | undefined> => {
  try {
    const ligaCode = generateLigaCode(); // Generar código aleatorio

    const [newLiga] = await sql<Liga[]>`
      INSERT INTO ${sql(ligaTable)} (name, jornada_id, created_by, created_jornada, code)
      VALUES (${liga.name}, ${liga.jornada_id}, ${liga.created_by}, ${liga.created_jornada}, ${ligaCode})
      RETURNING id, name, jornada_id, created_by, created_jornada, code
    `;
    return newLiga ?? null;
  } catch (error) {
    console.error(`❌ Error creating league:`, error);
    throw new Error(`Database error while creating league`);
  }
};

/**
 * Buscar liga por código.
 */
const findLigaByCodeService = async (code: string): Promise<Liga | undefined> => {
  try {
    const [liga] = await sql<Liga[]>`
      SELECT id, name, jornada_id, created_by, created_jornada, code
      FROM ${sql(ligaTable)}
      WHERE code = ${code}
      LIMIT 1
    `;
    return liga ?? null;
  } catch (error) {
    console.error(`❌ Error fetching league by code:`, error);
    throw new Error(`Database error while fetching league`);
  }
};

export { createLigaService, findLigaByCodeService };
