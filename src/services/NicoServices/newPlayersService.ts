import { sql }                    from '../supabaseService.js';
import { newPlayersTable }        from '../../models/NicoModels/NewPlayers.js';
import { equiposTable }           from '../../models/EquipoSupabase.js';
import NewPlayer, { PositionId }  from '../../types/NicoTypes/NewPlayer.js';

const ALLOWED_POSITIONS: PositionId[] = [24, 25, 26, 27];

/**
 * Crea un jugador manual en new_players usando el nombre del equipo.
 * @throws Error si positionId no válido o equipo no existe.
 */
export async function createNewPlayer(
  teamName:   string,
  positionId: PositionId,
  name:       string,
  imageUrl?:  string
): Promise<NewPlayer> {
  // 1) Validar positionId
  if (!ALLOWED_POSITIONS.includes(positionId)) {
    throw new Error(
      `positionId inválido. Solo se permiten: ${ALLOWED_POSITIONS.join(', ')}`
    );
  }

  // 2) Buscar el equipo por nombre
  const teams = await sql<{ id: number }[]>`
    SELECT id
    FROM ${sql(equiposTable)}
    WHERE name = ${teamName}
  `;
  if (teams.length === 0) {
    throw new Error(`No existe ningún equipo con nombre="${teamName}"`);
  }
  const equipoId = teams[0].id;

  // 3) Insertar el nuevo jugador
  const [created] = await sql<NewPlayer[]>`
    INSERT INTO ${sql(newPlayersTable)}
      (equipo_id, position_id, name, image_url)
    VALUES
      (${equipoId}, ${positionId}, ${name}, ${imageUrl ?? null})
    RETURNING
      id,
      equipo_id   AS equipoId,
      position_id AS positionId,
      name,
      image_url   AS imageUrl
  `;

  return created;
}

/**
 * Devuelve todos los jugadores.
 */
export async function getAllNewPlayers(): Promise<NewPlayer[]> {
  return await sql<NewPlayer[]>`
    SELECT
      id,
      equipo_id   AS equipoId,
      position_id AS positionId,
      name,
      image_url   AS imageUrl
    FROM ${sql(newPlayersTable)}
  `;
}

/**
 * Devuelve un jugador por su ID o null si no existe.
 */
export async function getNewPlayerById(id: number): Promise<NewPlayer | null> {
  const [player] = await sql<NewPlayer[]>`
    SELECT
      id,
      equipo_id   AS equipoId,
      position_id AS positionId,
      name,
      image_url   AS imageUrl
    FROM ${sql(newPlayersTable)}
    WHERE id = ${id}
  `;
  return player ?? null;
}

/**
 * Elimina un jugador por ID.
 */
export async function deleteNewPlayer(id: number): Promise<void> {
  await sql`
    DELETE FROM ${sql(newPlayersTable)}
    WHERE id = ${id}
  `;
}

/**
 * Actualiza un jugador existente por ID, recibiendo nombre de equipo, posición, nombre e imagen.
 */
export async function updateNewPlayer(
  id:         number,
  teamName:   string,
  positionId: PositionId,
  name:       string,
  imageUrl?:  string
): Promise<NewPlayer> {
  // existe?
  const existing = await getNewPlayerById(id);
  if (!existing) {
    throw new Error(`No existe jugador con id=${id}`);
  }
  // posición válida
  if (!ALLOWED_POSITIONS.includes(positionId)) {
    throw new Error(`positionId inválido. Solo: ${ALLOWED_POSITIONS.join(', ')}`);
  }
  // lookup equipo
  const teams = await sql<{ id: number }[]>`
    SELECT id FROM ${sql(equiposTable)} WHERE name = ${teamName}
  `;
  if (teams.length === 0) {
    throw new Error(`Equipo no encontrado: "${teamName}"`);
  }
  const equipoId = teams[0].id;

  // update
  const [updated] = await sql<NewPlayer[]>`
    UPDATE ${sql(newPlayersTable)}
    SET
      equipo_id   = ${equipoId},
      position_id = ${positionId},
      name        = ${name},
      image_url   = ${imageUrl ?? null}
    WHERE id = ${id}
    RETURNING
      id,
      equipo_id   AS equipoId,
      position_id AS positionId,
      name,
      image_url   AS imageUrl
  `;
  return updated;
}