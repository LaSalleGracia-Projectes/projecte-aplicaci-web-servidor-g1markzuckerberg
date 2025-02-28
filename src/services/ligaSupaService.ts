import { sql } from './supabaseService.js';
import type Liga from '../types/Liga.js';
import { ligaTable } from '../models/Liga.js';
import { usuariosLigasTable } from '../models/LigaUsuario.js';
import { userTable } from '../models/User.js';
import { jornadaTable } from '../models/Jornada.js';
import { getCurrentJornada, getJornadaByName } from './jornadaSupaService.js';

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

/**
 * 🔹 Obtener usuarios de una liga por código y jornada opcional usando la función `get_puntos_acumulados6`
 * - Si no se proporciona jornada, usa la jornada actual.
 * - Convierte `code` de liga en `id` de liga.
 * - Convierte `name` de jornada en `id` de jornada.
 */
const getUsersByLigaService = async (ligaCode: string, jornadaName?: string) => {
  try {
    // 🔹 Buscar la liga por código
    const liga = await findLigaByCodeService(ligaCode);
    if (!liga) {
      throw new Error('Liga no encontrada');
    }

    // 🔹 Determinar la jornada a consultar
    let jornada;
    if (jornadaName) {
      jornada = await getJornadaByName(jornadaName);
      if (!jornada) {
        throw new Error(`La jornada ${jornadaName} no existe`);
      }
    } else {
      jornada = await getCurrentJornada();
      if (!jornada) {
        throw new Error('No se pudo obtener la jornada actual');
      }
    }

    const jornadaId = jornada.id;
    const jornadaNumber = Number(jornada.name);
    const createdJornadaNumber = liga.created_jornada;

    // ❌ Validar si la jornada es anterior a la de creación de la liga
    if (jornadaNumber < createdJornadaNumber) {
      throw new Error(
        `No se puede consultar la jornada ${jornadaNumber} porque la liga fue creada en la jornada ${createdJornadaNumber}.`
      );
    }

    // 🔹 Obtener la jornada actual para evitar consultas a jornadas futuras
    const currentJornada = await getCurrentJornada();
    const currentJornadaNumber = currentJornada ? Number(currentJornada.name) : 0;

    // ❌ Validar si la jornada es mayor a la actual
    if (jornadaNumber > currentJornadaNumber) {
      throw new Error(
        `No se puede consultar la jornada ${jornadaNumber} porque aún no ha comenzado.`
      );
    }

    // 🔹 Ejecutar la función `get_puntos_acumulados6` en Supabase
    const users = await sql`
      SELECT u.username, p.*
      FROM get_puntos_acumulados6(${liga.id}, ${jornadaId}) AS p
      JOIN ${sql(userTable)} u ON p.usuario_id = u.id
      ORDER BY p.puntos_acumulados DESC, u.username ASC;
    `;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    return { liga, users, jornada_id: jornadaId };
  } catch (error) {
    console.error(`❌ Error al obtener usuarios de la liga:`, error);
    throw new Error(`Database error while fetching league users`);
  }
};

/**
 * 🔹 **Verifica si un usuario está en una liga.**
 * @param usuarioId - ID del usuario.
 * @param ligaId - ID de la liga.
 * @returns {Promise<boolean>} - `true` si el usuario está en la liga, `false` en caso contrario.
 */
const isUserInLigaService = async (usuarioId: number, ligaId: number): Promise<boolean> => {
  try {
    const [exists] = await sql`
      SELECT 1 FROM ${sql(usuariosLigasTable)}
      WHERE usuario_id = ${usuarioId} AND liga_id = ${ligaId}
      LIMIT 1;
    `;

    return Boolean(exists);
  } catch (error) {
    console.error(`❌ Error al verificar si el usuario está en la liga:`, error);
    throw new Error(`Database error while checking user in league`);
  }
};




export { createLigaService, findLigaByCodeService, addUserToLigaService, getUsersByLigaService, isUserInLigaService };
