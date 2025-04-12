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
 * Agregar un usuario a una liga en la tabla de relación
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
 * Obtener usuarios de una liga por código y jornada opcional usando la función `get_puntos_acumulados6`
 * - Si no se proporciona jornada, usa la jornada actual.
 * - Convierte `code` de liga en `id` de liga.
 * - Convierte `name` de jornada en `id` de jornada.
 */
const getUsersByLigaService = async (ligaCode: string, jornadaName?: string) => {
  try {
    // Buscar la liga por código para obtener su ID y datos
    const liga = await findLigaByCodeService(ligaCode);
    if (!liga) {
      throw new Error('Liga no encontrada');
    }

    // Determinar la jornada a consultar
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

    // Validar que la jornada consultada no sea anterior a la jornada en que se creó la liga
    if (jornadaNumber < createdJornadaNumber) {
      throw new Error(
        `No se puede consultar la jornada ${jornadaNumber} porque la liga fue creada en la jornada ${createdJornadaNumber}.`
      );
    }

    // Obtener la jornada actual para evitar consultar jornadas futuras
    const currentJornada = await getCurrentJornada();
    const currentJornadaNumber = currentJornada ? Number(currentJornada.name) : 0;
    if (jornadaNumber > currentJornadaNumber) {
      throw new Error(
        `No se puede consultar la jornada ${jornadaNumber} porque aún no ha comenzado.`
      );
    }

    // Consultar la vista vw_puntos_acumulados para obtener los usuarios con sus puntos
    // Se asegura que cada registro tenga el id del usuario (alias "id")
    // y se agrega una subconsulta que cuenta el total de usuarios de la liga.
    const users = await sql`
      SELECT 
        u.username, 
        u.id AS id, 
        v.puntos_jornada, 
        v.puntos_acumulados,
        (
          SELECT COUNT(*) 
          FROM ${sql(usuariosLigasTable)} ul
          WHERE ul.liga_id = ${liga.id}
        ) AS total_users
      FROM vw_puntos_acumulados v
      JOIN ${sql(userTable)} u ON v.usuario_id = u.id
      WHERE v.liga_id = ${liga.id} AND v.jornada_id = ${jornadaId}
      ORDER BY v.puntos_acumulados DESC, u.username ASC;
    `;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    return { liga, users, jornada_id: jornadaId };
  } catch (error) {
    console.error('❌ Error al obtener usuarios de la liga:', error);
    throw new Error('Database error while fetching league users');
  }
};

/**
 * **Verifica si un usuario está en una liga.**
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

/**
 * Buscar liga por id.
 */
const findLigaByIdService = async (id: number): Promise<Liga | undefined> => {
  try {
    const [liga] = await sql<Liga[]>`
      SELECT id, name, jornada_id, created_by, created_jornada, code
      FROM ${sql(ligaTable)}
      WHERE id = ${id}
      LIMIT 1
    `;
    return liga ?? null;
  } catch (error) {
    console.error(`❌ Error fetching league by id:`, error);
    throw new Error(`Database error while fetching league`);
  }
};

/**
 * Obtener el código de una liga por id.
 * Solo devuelve el código si el usuario autenticado es miembro de la liga.
 *
 * @param ligaId - Id de la liga.
 * @param userId - Id del usuario autenticado.
 * @returns {Promise<string>} - El código de la liga.
 */
const getLigaCodeByIdService = async (ligaId: number, userId: number): Promise<string> => {
  // Buscar la liga por id.
  const liga = await findLigaByIdService(ligaId);
  if (!liga) {
    throw new Error('Liga no encontrada');
  }
  
  // Verificar si el usuario es miembro de la liga.
  const isMember = await isUserInLigaService(userId, liga.id);
  if (!isMember) {
    throw new Error('No estás unido a esta liga');
  }
  
  return liga.code;
};

/**
 * Eliminar un usuario de una liga.
 * Solo puede hacerlo el capitán de la liga.
 *
 * @param capitanId - ID del usuario que realiza la acción (capitán), obtenido desde res.locals.
 * @param ligaId - ID de la liga.
 * @param userIdToRemove - ID del usuario a eliminar.
 * @returns {Promise<boolean>} - Retorna true si se eliminó correctamente.
 */
const removeUserFromLigaService = async (
  capitanId: number,
  ligaId: number,
  userIdToRemove: number
): Promise<boolean> => {
  // Verificar que el usuario que realiza la acción es capitán en la liga.
  const [captainRecord] = await sql`
    SELECT is_capitan FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${capitanId} AND liga_id = ${ligaId}
    LIMIT 1;
  `;
  if (!captainRecord?.is_capitan) {
    throw new Error('No eres el capitán de la liga');
  }

  // Opcional: Prevenir que el capitán se elimine a sí mismo.
  if (capitanId === userIdToRemove) {
    throw new Error('El capitán no puede eliminarse a sí mismo');
  }

  // Verificar que el usuario a eliminar está en la liga.
  const [userRecord] = await sql`
    SELECT 1 FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${userIdToRemove} AND liga_id = ${ligaId}
    LIMIT 1;
  `;
  if (!userRecord) {
    throw new Error('El usuario a eliminar no está en la liga');
  }

  // Eliminar la relación del usuario en la liga.
  await sql`
    DELETE FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${userIdToRemove} AND liga_id = ${ligaId};
  `;

  return true;
};

/**
 * Asigna a otro usuario como capitán en una liga.
 * Solo puede hacerlo el actual capitán.
 *
 * @param currentUserId - ID del usuario actual (desde res.locals).
 * @param ligaId - ID de la liga.
 * @param newCaptainId - ID del nuevo capitán.
 */
const assignNewCaptainService = async (
  currentUserId: number,
  ligaId: number,
  newCaptainId: number
): Promise<void> => {
  // Verificar que el usuario actual es capitán en la liga.
  const [current] = await sql`
    SELECT is_capitan FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${currentUserId} AND liga_id = ${ligaId}
    LIMIT 1;
  `;
  if (!current?.is_capitan) {
    throw new Error('No eres el capitán de esta liga');
  }

  if (currentUserId === newCaptainId) {
    throw new Error('No puedes hacerte capitán a ti mismo');
  }

  // Verificar que el nuevo capitán pertenezca a la liga.
  const [newCap] = await sql`
    SELECT 1 FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${newCaptainId} AND liga_id = ${ligaId}
    LIMIT 1;
  `;
  if (!newCap) {
    throw new Error('El nuevo capitán no pertenece a esta liga');
  }

  // Actualizar la tabla: quitar la capitanía al actual y asignarla al nuevo.
  await sql`
    UPDATE ${sql(usuariosLigasTable)}
    SET is_capitan = CASE 
      WHEN usuario_id = ${newCaptainId} THEN TRUE
      WHEN usuario_id = ${currentUserId} THEN FALSE
      ELSE is_capitan END
    WHERE liga_id = ${ligaId} AND usuario_id IN (${currentUserId}, ${newCaptainId});
  `;
};

/**
 * Permite al usuario actual abandonar una liga.
 * No puede hacerlo si es capitán.
 *
 * @param userId - ID del usuario actual (desde res.locals).
 * @param ligaId - ID de la liga.
 */
const abandonLigaService = async (userId: number, ligaId: number): Promise<void> => {
  const [record] = await sql`
    SELECT is_capitan FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${userId} AND liga_id = ${ligaId}
    LIMIT 1;
  `;
  
  if (!record) throw new Error('No estás en esta liga');
  if (record.is_capitan) throw new Error('El capitán no puede abandonar la liga');

  await sql`
    DELETE FROM ${sql(usuariosLigasTable)}
    WHERE usuario_id = ${userId} AND liga_id = ${ligaId};
  `;
};

/**
 * Obtiene la información básica de un usuario que pertenece a una liga,
 * junto con los datos de la relación (puntos_totales, is_capitan).
 *
 * @param leagueId - ID de la liga.
 * @param userId - ID del usuario.
 * @returns Un objeto con la información del usuario y su relación en la liga.
 */
const getUserFromLeagueByIdService = async (leagueId: number, userId: number) => {
  try {
    const [record] = await sql`
      SELECT u.id, u.username, u."birthDate", ul.puntos_totales, ul.is_capitan
      FROM ${sql(userTable)} u
      JOIN ${sql(usuariosLigasTable)} ul ON u.id = ul.usuario_id
      WHERE ul.liga_id = ${leagueId} AND u.id = ${userId}
      LIMIT 1;
    `;
    if (!record) {
      throw new Error('Usuario no encontrado en la liga');
    }

    return record;
  } catch (error) {
    console.error('❌ Error fetching user from league:', error);
    throw new Error('Database error while fetching user from league');
  }
};

/**
 * Obtiene la información de una liga a partir de su ID.
 * 
 * @param id - ID de la liga.
 * @returns La liga encontrada o null si no existe.
 */
const getLigaByIdService = async (id: number): Promise<Liga | undefined> => {
  try {
    const [liga] = await sql<Liga[]>`
      SELECT id, name, jornada_id, created_by, created_jornada, code
      FROM ${sql(ligaTable)}
      WHERE id = ${id}
      LIMIT 1
    `;
    return liga ?? null;
  } catch (error: any) {
    console.error("❌ Error fetching league by id:", error);
    throw new Error("Database error while fetching league");
  }
};

export { createLigaService, findLigaByCodeService, addUserToLigaService, getUsersByLigaService,
  isUserInLigaService, getLigaCodeByIdService, removeUserFromLigaService, assignNewCaptainService,
  abandonLigaService, getUserFromLeagueByIdService, getLigaByIdService };
