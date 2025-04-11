import { sql } from "./supabaseService";
import { plantillaJugadoresTable } from "../models/PlantillaJugadores";
import { tempPlantillaTable } from "../models/TempPlantilla";
import { plantillaTable } from "../models/Plantilla";
import type Plantilla from "../types/Plantilla";
import PlantillaJugador from "../types/PlantillaJugador";
import type TempPlantilla from "../types/TempPlantilla";
import type Player from "../types/Player";
import type Round from "../types/Round";
import type { PositionOptions } from "../types/TempPlantilla";
import { getCurrentJornada } from "./jornadaSupaService";

/**
 * Selecciona jugadores aleatoriamente para una posición usando un algoritmo de selección
 * ponderada basado en el campo "estrellas". Los jugadores con 2, 3 y 4 estrellas tienen mayor
 * probabilidad de ser elegidos, mientras que los de 1 y 5 estrellas tienen menor probabilidad.
 * Se excluyen aquellos cuyos IDs ya se hayan seleccionado.
 */
async function getWeightedRandomPlayersByPosition(
  positionId: number,
  limit: number,
  excludeIds: number[] = []
): Promise<Player[]> {
  const players = await sql<Player[]>`
    SELECT *
    FROM ${sql('jugadores')}
    WHERE "positionId" = ${positionId}
      AND id NOT IN (${sql(excludeIds)})
  `;
  
  if (players.length < limit) {
    throw new Error(`Not enough players available for position ${positionId}`);
  }
  
  function weight(player: Player): number {
    const estrellas = player.estrellas ?? 3;
    if (estrellas === 1 || estrellas === 5) return 1;
    if (estrellas === 2 || estrellas === 4) return 3;
    if (estrellas === 3) return 4;
    return 1;
  }
  
  const selected: Player[] = [];
  const available = [...players];
  
  // Selección ponderada sin reemplazo
  for (let i = 0; i < limit; i++) {
    const totalWeight = available.reduce((sum, p) => sum + weight(p), 0);
    let randomValue = Math.random() * totalWeight;
    let selectedIndex = -1;
    for (let j = 0; j < available.length; j++) {
      randomValue -= weight(available[j]);
      if (randomValue <= 0) {
        selectedIndex = j;
        break;
      }
    }

    if (selectedIndex === -1) {
      selectedIndex = available.length - 1;
    }

    const chosen = available.splice(selectedIndex, 1)[0];
    selected.push(chosen);
  }
  
  return selected;
}

/**
 * Crea la plantilla temporal (tempPlantilla) en la que se generan las opciones para cada posición.
 * Cada posición se representa como un tuple de 5 elementos:
 *   [Player, Player, Player, Player, number | undefined]
 * donde el quinto elemento representa el índice elegido (0 a 3) y se inicia como undefined.
 *
 * La cantidad de posiciones por grupo se define según la formación:
 *   - "4-3-3": 3 delanteros, 3 mediocampistas, 4 defensas, 1 portero.
 *   - "4-4-2": 2 delanteros, 4 mediocampistas, 4 defensas, 1 portero.
 *   - "3-4-3": 3 delanteros, 4 mediocampistas, 3 defensas, 1 portero.
 */
export async function createTempPlantilla(formation: string): Promise<TempPlantilla> {
  let counts: { forward: number; midfield: number; defense: number } = { forward: 0, midfield: 0, defense: 0 };
  switch (formation) {
    case "4-3-3":
      counts = { forward: 3, midfield: 3, defense: 4 };
      break;
    case "4-4-2":
      counts = { forward: 2, midfield: 4, defense: 4 };
      break;
    case "3-4-3":
      counts = { forward: 3, midfield: 4, defense: 3 };
      break;
    default:
      throw new Error("Formation not supported");
  }
  
  const goalkeeperCount = 1; // Siempre 1 portero
  const selectedIds: number[] = [];
  
  async function getOptionsForPosition(positionId: number, count: number): Promise<PositionOptions[]> {
    const options: PositionOptions[] = [];
    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line no-await-in-loop
      const candidates = await getWeightedRandomPlayersByPosition(positionId, 4, selectedIds);
      if (candidates.length < 4) {
        throw new Error(`Not enough players available for position ${positionId}`);
      }

      candidates.forEach(player => selectedIds.push(player.id));
      const option = [candidates[0]!, candidates[1]!, candidates[2]!, candidates[3]!, undefined] as PositionOptions;
      options.push(option);
    }

    return options;
  }
  
  const forwardOptions = await getOptionsForPosition(27, counts.forward);
  const midfieldOptions = await getOptionsForPosition(26, counts.midfield);
  const defenseOptions = await getOptionsForPosition(25, counts.defense);
  const goalkeeperOptions = await getOptionsForPosition(24, goalkeeperCount);
  
  const playerOptions: PositionOptions[] = [
    ...forwardOptions,
    ...midfieldOptions,
    ...defenseOptions,
    ...goalkeeperOptions,
  ];
  
  const tempPlantilla: TempPlantilla = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    id_plantilla: 0, // Valor provisional; se actualizará al crear la plantilla en la BD
    playerOptions,
  };
  
  return tempPlantilla;
}

/**
 * Crea el draft para una ronda. Valida que la fecha actual sea posterior a round.ending_at para permitir la creación.
 * Además, verifica si ya existe una plantilla para ese equipo, temporada y draft (basado en el draftName).
 * Si existe y no está finalizada, retorna la tempPlantilla existente para actualización.
 * Si no existe, crea la plantilla en la tabla 'plantilla', genera la tempPlantilla y la guarda en la tabla 'tempPlantilla'.
 *
 * Sólo se puede crear un draft único por equipo y ronda.
 *
 * @param teamId - ID del equipo que crea el draft.
 * @param formation - Formación elegida ("4-3-3", "4-4-2", "3-4-3").
 * @param round - Objeto Round con la información de la ronda.
 * @returns La tempPlantilla generada.
 */
export async function createDraftForRound(
  teamId: number,
  formation: string,
  round: Round
): Promise<TempPlantilla> {
  const now = new Date();
  const roundEnd = new Date(round.ending_at);
  
  if (now < roundEnd) {
    throw new Error("No se puede crear el draft: la ronda actual aún no ha finalizado");
  }
  
  const draftName = "Draft para ronda " + round.name;
  
  const existingPlantilla = await sql<Plantilla[]>`
    SELECT *
    FROM ${sql(plantillaTable)}
    WHERE "teamId" = ${teamId} AND "seasonId" = ${round.season_id} AND name = ${draftName}
    LIMIT 1
  `;
  
  if (existingPlantilla.length > 0) {
    const plantilla = existingPlantilla[0];
    if (plantilla.finalized) {
      throw new Error("El draft ya fue finalizado y no se puede editar");
    }
    
    const existingTempData = await sql`
      SELECT data
      FROM ${sql(tempPlantillaTable)}
      WHERE plantilla_id = ${plantilla.id}
      LIMIT 1
    `;
    if (existingTempData.length > 0) {
      const temp: TempPlantilla = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        id_plantilla: plantilla.id,
        playerOptions: existingTempData[0].data as PositionOptions[],
      };
      return temp;
    }
  }
  
  const plantillaInsert = await sql<Plantilla[]>`
    INSERT INTO ${sql(plantillaTable)} ("teamId", "seasonId", name, finalized)
    VALUES (${teamId}, ${round.season_id}, ${draftName}, false)
    RETURNING *
  `;
  
  if (!plantillaInsert || plantillaInsert.length === 0) {
    throw new Error("Error al crear la plantilla");
  }
  
  const plantilla = plantillaInsert[0];
  const tempPlantilla = await createTempPlantilla(formation);
  tempPlantilla.id_plantilla = plantilla.id;
  
  await sql`
    INSERT INTO ${sql(tempPlantillaTable)} ("plantilla_id", data)
    VALUES (${plantilla.id}, ${JSON.stringify(tempPlantilla.playerOptions)})
  `;
  
  return tempPlantilla;
}

/**
 * Actualiza el JSON de la tempPlantilla (por ejemplo, cuando se modifica el "chosen" en alguna posición).
 * Sólo se permite la actualización si la plantilla (draft) aún no está finalizada.
 *
 * @param plantillaId - ID de la plantilla.
 * @param newData - Nuevo array de PositionOptions para la tempPlantilla.
 */
export async function updateTempPlantilla(
  plantillaId: number,
  newData: PositionOptions[]
): Promise<void> {
  const [plantilla] = await sql<Plantilla[]>`
    SELECT finalized
    FROM ${sql(plantillaTable)}
    WHERE id = ${plantillaId}
    LIMIT 1
  `;
  
  if (plantilla?.finalized) {
    throw new Error("El draft ya está finalizado y no se puede editar");
  }
  
  await sql`
    UPDATE ${sql(tempPlantillaTable)}
    SET data = ${JSON.stringify(newData)}
    WHERE plantilla_id = ${plantillaId}
  `;
}

/**
 * Guarda la selección final del draft en la tabla 'plantilla_jugadores'.
 * Recorre cada grupo de opciones en la tempPlantilla y, usando el índice elegido (quinto elemento),
 * inserta la relación (plantilla_id, jugador_id). Luego, marca la plantilla como finalizada.
 *
 * @param tempDraft - La TempPlantilla final, en la cual cada PositionOptions tiene un valor numérico definido en el quinto elemento.
 */
export async function saveDraftSelection(tempDraft: TempPlantilla): Promise<void> {
  const insertPromises = tempDraft.playerOptions.map(async options => {
    const chosenIndex = options[4];
    if (chosenIndex === undefined) {
      return Promise.reject(new Error("No se ha seleccionado un jugador en alguna posición"));
    }

    const selectedPlayer = options[chosenIndex];
    if (typeof selectedPlayer === "number" || !selectedPlayer || !("id" in selectedPlayer)) {
      return Promise.reject(new Error("Invalid player selection: expected a Player object with an id property"));
    }
    
    return sql`
      INSERT INTO ${sql(plantillaJugadoresTable)} ("plantilla_id", "jugador_id")
      VALUES (${tempDraft.id_plantilla}, ${selectedPlayer.id})
      ON CONFLICT DO NOTHING
    `;
  });
  
  await Promise.all(insertPromises);
  
  await sql`
    UPDATE ${sql(plantillaTable)}
    SET finalized = true
    WHERE id = ${tempDraft.id_plantilla}
  `;
}


/**
 * Obtiene la plantilla (draft) final y sus jugadores ya guardados en la relación.
 * Se busca usando el draftName "Draft para ronda " + roundName; si roundName no se proporciona,
 * se usa la jornada actual (obtenida por getCurrentJornada).
 * La temporada actual se obtiene directamente mediante una consulta SQL (la última insertada en "seasons").
 *
 * @param teamId - ID del equipo.
 * @param roundName - (Opcional) Nombre de la ronda.
 * @returns Objeto con la plantilla y un array de jugadores.
 */
export async function getPlantillaWithPlayers(
  teamId: number,
  roundName?: string
): Promise<{ plantilla: Plantilla; players: Player[] }> {
  // Obtener la temporada actual directamente con SQL (la última insertada en "seasons")
  const seasonRes = await sql<Array<{ id: number }>>`
    SELECT id
    FROM ${sql('seasons')}
    ORDER BY id DESC
    LIMIT 1
  `;
  if (seasonRes.length === 0) {
    throw new Error("No se encontró la temporada actual");
  }

  const seasonId = seasonRes[0].id;

  let effectiveRoundName = roundName;
  if (!effectiveRoundName) {
    const currentRound = await getCurrentJornada();
    if (!currentRound) {
      throw new Error("No se encontró la jornada actual");
    }
    
    effectiveRoundName = currentRound.name;
  }
  
  const draftName = "Draft para ronda " + effectiveRoundName;
  
  const plantillaRes = await sql<Plantilla[]>`
    SELECT *
    FROM ${sql(plantillaTable)}
    WHERE "teamId" = ${teamId}
      AND "seasonId" = ${seasonId}
      AND name = ${draftName}
    LIMIT 1
  `;
  
  if (plantillaRes.length === 0) {
    throw new Error("No se encontró el draft para esos parámetros");
  }
  
  const plantilla = plantillaRes[0];
  
  const players = await sql<Player[]>`
    SELECT j.*
    FROM ${sql(plantillaJugadoresTable)} pj
    JOIN ${sql('jugadores')} j ON pj.jugador_id = j.id
    WHERE pj.plantilla_id = ${plantilla.id}
  `;
  
  return { plantilla, players };
}