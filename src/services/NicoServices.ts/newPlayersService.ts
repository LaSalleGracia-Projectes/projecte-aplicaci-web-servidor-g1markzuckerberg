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