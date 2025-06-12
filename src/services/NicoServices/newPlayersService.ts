import { sql } from '../supabaseService.js';
import { newPlayersTable } from '../../models/NicoModels/NewPlayers.js';
import NewPlayer from '../../types/NicoTypes/NewPlayer.js';

/**
 * Obtiene todos los jugadores (público)
 */
export async function getAllNewPlayersService(): Promise<NewPlayer[]> {
  return await sql<NewPlayer[]>`
    SELECT
      id,
      equipo_id,
      position_id,
      displayname,
      imagepath
    FROM ${sql(newPlayersTable)}
  `;
}

/**
 * Obtiene un jugador por su ID (público)
 */
export async function getNewPlayerByIdService(
  id: number
): Promise<NewPlayer | null> {
  const [player] = await sql<NewPlayer[]>`
    SELECT
      id,
      equipo_id,
      position_id,
      displayname,
      imagepath
    FROM ${sql(newPlayersTable)}
    WHERE id = ${id}
  `;
  return player ?? null;
}

/**
 * Crea un jugador manual en new_players usando los campos directos (público)
 */
export async function createNewPlayerService(
  equipo_id:   number,
  position_id: number,
  displayname: string,
  imagepath?:  string
): Promise<NewPlayer> {
  // Validar que el equipo existe por id
  const [team] = await sql<{ id: number }[]>`
    SELECT id FROM equipos WHERE id = ${equipo_id}
  `;
  if (!team) {
    throw new Error(`No existe ningún equipo con id="${equipo_id}"`);
  }
  const [created] = await sql<NewPlayer[]>`
    INSERT INTO ${sql(newPlayersTable)}
      (equipo_id, position_id, displayname, imagepath)
    VALUES
      (${equipo_id}, ${position_id}, ${displayname}, ${imagepath ?? null})
    RETURNING
      id,
      equipo_id,
      position_id,
      displayname,
      imagepath
  `;
  return created;
}

/**
 * Actualiza un jugador existente por ID (público)
 */
export async function updateNewPlayerService(
  id:          number,
  equipo_id:   number,
  position_id: number,
  displayname: string,
  imagepath?:  string
): Promise<NewPlayer> {
  // Verificar existencia del jugador
  const [existing] = await sql<NewPlayer[]>`
    SELECT id FROM ${sql(newPlayersTable)} WHERE id = ${id}
  `;
  if (!existing) {
    throw new Error(`No existe jugador con id=${id}`);
  }
  // Validar que el equipo existe por id
  const [team] = await sql<{ id: number }[]>`
    SELECT id FROM equipos WHERE id = ${equipo_id}
  `;
  if (!team) {
    throw new Error(`No existe ningún equipo con id="${equipo_id}"`);
  }
  // Actualizar
  const [updated] = await sql<NewPlayer[]>`
    UPDATE ${sql(newPlayersTable)}
    SET
      equipo_id   = ${equipo_id},
      position_id = ${position_id},
      displayname = ${displayname},
      imagepath   = ${imagepath ?? null}
    WHERE id = ${id}
    RETURNING
      id,
      equipo_id,
      position_id,
      displayname,
      imagepath
  `;
  return updated;
}

/**
 * Elimina un jugador por ID (público)
 * @returns true si se eliminó al menos un registro.
 */
export async function deleteNewPlayerService(
  id: number
): Promise<boolean> {
  const result = await sql`
    DELETE FROM ${sql(newPlayersTable)}
    WHERE id = ${id}
    RETURNING id;
  `;
  return result.length > 0;
}
