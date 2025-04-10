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
 *  [Player, Player, Player, Player, number | undefined]
 *
 * El quinto elemento representa el índice elegido (entre 0 y 3) de las 4 opciones y se inicializa como undefined.
 *
 * La cantidad de posiciones por grupo se define según la formación:
 *  - "4-3-3": 3 delanteros, 3 mediocampistas, 4 defensas, 1 portero.
 *  - "4-4-2": 2 delanteros, 4 mediocampistas, 4 defensas, 1 portero.
 *  - "3-4-3": 3 delanteros, 4 mediocampistas, 3 defensas, 1 portero.
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

  // PositionOptions definida en TempPlantilla es: [Player, Player, Player, Player, number | undefined]
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

  // Ordena las filas en el orden deseado (por ejemplo, se lee de arriba a abajo, izquierda a derecha)
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
 * Crea el draft para una ronda, validando que la fecha actual esté dentro del período permitido.
 * Primero se crea la plantilla en la tabla 'plantilla', luego se genera la plantilla temporal (tempPlantilla)
 * y finalmente se inserta el JSON resultante en la tabla 'tempPlantilla'.
 *
 * Solo se puede crear el draft si la ronda actual ya ha finalizado (según round.ending_at).
 *
 * @param teamId - ID del equipo que crea el draft.
 * @param formation - Formación elegida ("4-3-3", "4-4-2", "3-4-3").
 * @param round - Objeto Round con información de la ronda actual.
 * @returns La plantilla temporal generada.
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
  // Aquí podrías ampliar la validación para asegurarte que se encuentra en el período permitido.

  // Crear la plantilla en la tabla 'plantilla'
  const plantillaInsert = await sql<Plantilla[]>`
    INSERT INTO ${sql(plantillaTable)} (teamId, seasonId, name)
    VALUES (${teamId}, ${round.season_id}, ${"Draft para ronda " + round.name})
    RETURNING *
  `;
  if (!plantillaInsert || plantillaInsert.length === 0) {
    throw new Error("Error al crear la plantilla");
  }
  
  const plantilla = plantillaInsert[0];

  // Generar la plantilla temporal (tempPlantilla)
  const tempPlantilla = await createTempPlantilla(formation);
  tempPlantilla.id_plantilla = plantilla.id;

  // Insertar en la tabla tempPlantilla (campo JSON)
  await sql`
    INSERT INTO ${sql(tempPlantillaTable)} (plantilla_id, data)
    VALUES (${plantilla.id}, ${JSON.stringify(tempPlantilla.playerOptions)})
  `;

  return tempPlantilla;
}

/**
 * Una vez finalizada la selección de jugadores en cada posición (cuando el quinto elemento de cada tuple
 * ya tiene un valor numérico definido, entre 0 y 3), guarda la selección definitiva en la tabla 'plantilla_jugadores'.
 *
 * Recorre cada grupo de opciones de la plantilla temporal y, usando el índice elegido, inserta la relación (plantilla_id, jugador_id).
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
      INSERT INTO ${sql(plantillaJugadoresTable)} (plantilla_id, jugador_id)
      VALUES (${tempDraft.id_plantilla}, ${selectedPlayer.id})
      ON CONFLICT DO NOTHING
    `;
  });
  
  await Promise.all(insertPromises);
}