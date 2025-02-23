import { sql } from './supabaseService.js';
import type Liga from '../types/Liga.js';
import { ligaTable } from '../models/Liga.js';
import { usuariosLigasTable } from '../models/LigaUsuario.js';
import { userTable } from '../models/User.js';
import { jornadaTable } from '../models/Jornada.js';

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

/**
 * 🔹 Agregar un usuario a una liga en la tabla de relación
 * @param usuario_id - ID del usuario
 * @param liga_id - ID de la liga
 * @param is_capitan - Booleano para indicar si el usuario es capitán
 */
const addUserToLigaService = async (usuario_id: number, liga_id: number, is_capitan: boolean): Promise<boolean> => {
  try {
    await sql`
      INSERT INTO ${sql(usuariosLigasTable)} (usuario_id, liga_id, is_capitan, puntos_totales)
      VALUES (${usuario_id}, ${liga_id}, ${is_capitan}, 0)
      ON CONFLICT (usuario_id, liga_id) DO NOTHING;
    `;

    return true;
  } catch (error) {
    console.error(`❌ Error al agregar usuario a la liga:`, error);
    return false;
  }
};

const getUsersByLigaService = async (ligaCode: string, jornada_id?: number) => {
  try {
    // Buscar la liga por código
    const [liga] = await sql<Array<{ id: number; jornada_id: number }>>`
      SELECT id, jornada_id FROM ${sql(ligaTable)}
      WHERE code = ${ligaCode}
      LIMIT 1
    `;

    if (!liga) {
      throw new Error('Liga no encontrada');
    }

    // Si no se proporciona jornada_id, buscar la jornada actual
    let jornadaActualId = jornada_id;
    if (!jornada_id) {
      const [currentJornada] = await sql<Array<{ id: number }>>`
        SELECT id FROM ${sql(jornadaTable)}
        WHERE is_current = true
        LIMIT 1
      `;
      if (currentJornada) {
        jornadaActualId = currentJornada.id;
      }
    }

    // Obtener los usuarios de la liga con sus puntos ordenados
    const users = await sql`
      SELECT 
        u.id, u.username, ul.puntos_totales, ul.is_capitan
      FROM ${sql(usuariosLigasTable)} ul
      JOIN ${sql(userTable)} u ON ul.usuario_id = u.id
      WHERE ul.liga_id = ${liga.id}
      ORDER BY ul.puntos_totales DESC, u.username ASC;
    `;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    return { liga, users, jornada_id: jornadaActualId };
  } catch (error) {
    console.error(`❌ Error al obtener usuarios de la liga:`, error);
    throw new Error(`Database error while fetching league users`);
  }
};



export { createLigaService, findLigaByCodeService, addUserToLigaService, getUsersByLigaService };
