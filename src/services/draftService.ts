import { sql } from "./supabaseService.js";
import { plantillaJugadoresTable } from "../models/PlantillaJugadores.js";
import { tempPlantillaTable } from "../models/TempPlantilla.js";
import { plantillaTable } from "../models/Plantilla.js";
import type Plantilla from "../types/Plantilla.js";
import type TempPlantilla from "../types/TempPlantilla.js";
import type Player from "../types/Player.js";
import type Round from "../types/Round.js";
import type Liga from "../types/Liga.js";
import type { PositionOptions } from "../types/TempPlantilla.js";
import { getCurrentJornada, getNextJornada } from "./jornadaSupaService.js";

/**
 * Selecciona jugadores aleatoriamente para una posición usando un algoritmo de selección
 * ponderada basado en el campo "estrellas". Los jugadores con 2, 3 y 4 estrellas tienen mayor
 * probabilidad de ser elegidos, mientras que los de 1 y 5 estrellas tienen menor probabilidad.
 * Se excluyen aquellos cuyos IDs ya se hayan seleccionado.
 *
 * @param {number} positionId - ID de la posición.
 * @param {number} limit - Número de jugadores a seleccionar.
 * @param {number[]} [excludeIds=[]] - IDs de jugadores a excluir.
 * @returns {Promise<Player[]>} - Array de jugadores seleccionados.
 */
async function getWeightedRandomPlayersByPosition(
  positionId: number,
  limit: number,
  excludeIds: number[] = []
): Promise<Player[]> {
  const players = await sql<Player[]>`
    SELECT *
    FROM ${sql("jugadores")}
    WHERE "positionId" = ${positionId}
    ${excludeIds.length > 0 ? sql`AND id NOT IN ${sql(excludeIds)}` : sql``}
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
 * Crea la plantilla temporal (TempPlantilla) en la que se generan las opciones para cada posición.
 * Cada posición se representa como un tuple de 5 elementos:
 *   [Player, Player, Player, Player, number | undefined]
 * donde el quinto elemento representa el índice elegido (0 a 3) y se inicia como undefined.
 *
 * La cantidad de posiciones por grupo se define según la formación:
 *   - "4-3-3": 3 delanteros, 3 mediocampistas, 4 defensas, 1 portero.
 *   - "4-4-2": 2 delanteros, 4 mediocampistas, 4 defensas, 1 portero.
 *   - "3-4-3": 3 delanteros, 4 mediocampistas, 3 defensas, 1 portero.
 *
 * @param {string} formation - Formación elegida.
 * @returns {Promise<TempPlantilla>} - Objeto TempPlantilla generado.
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
    id_plantilla: 0,
    playerOptions,
  };

  return tempPlantilla;
}

/**
 * Crea el draft para una ronda (para la siguiente jornada).
 * Se verifica (comentado para pruebas) que la fecha actual sea posterior a round.ending_at.
 * Además, se verifica si ya existe una plantilla para ese usuario, liga y jornada; si existe y no está finalizada,
 * retorna la TempPlantilla existente para actualización. Si no existe, crea la plantilla en la tabla 'plantilla',
 * genera la TempPlantilla y la guarda en la tabla 'tempPlantilla'.
 *
 * Sólo se puede crear un draft único por usuario, liga y jornada.
 *
 * @param {number} userId - ID del usuario que crea el draft.
 * @param {string} formation - Formación elegida ("4-3-3", "4-4-2", "3-4-3").
 * @param {Liga} liga - Objeto Liga; se utiliza liga.id para el draft.
 * @returns {Promise<TempPlantilla>} - La TempPlantilla generada.
 */
export async function createDraftForRound(
  userId: number,
  formation: string,
  liga: Liga
): Promise<TempPlantilla> {
  const currentRound = await getCurrentJornada();
  const nextRound = await getNextJornada();

  if (!currentRound || !nextRound) {
    throw new Error("No se pudieron obtener las jornadas necesarias para crear el draft");
  }

  /*
  Aconst now = new Date();
  const currentEnd = new Date(currentRound.ending_at);
  const nextStart = new Date(nextRound.starting_at);

  if (now < currentEnd || now >= nextStart) {
    throw new Error(
      "Solo se puede crear el draft entre el final de la jornada actual y el inicio de la siguiente"
    );
  }
  */

  // ⚠️ Si ya existe una plantilla, no dejamos crear otra, sin importar si está finalizada o no
  const existingPlantilla = await sql<Plantilla[]>`
    SELECT id FROM ${sql(plantillaTable)}
    WHERE usuario_id = ${userId}
      AND liga_id = ${liga.id}
      AND jornada_id = ${nextRound.id}
    LIMIT 1
  `;

  if (existingPlantilla.length > 0) {
    throw new Error("Ya existe un draft creado para esta liga y jornada");
  }

  // Si no existe ninguna, procedemos a crearla
  const plantillaInsert = await sql<Plantilla[]>`
    INSERT INTO ${sql(plantillaTable)} (usuario_id, liga_id, jornada_id, formation, finalized)
    VALUES (${userId}, ${liga.id}, ${nextRound.id}, ${formation}, false)
    RETURNING *
  `;

  if (!plantillaInsert.length) {
    throw new Error("Error al crear la plantilla");
  }

  const plantilla = plantillaInsert[0];
  const tempPlantilla = await createTempPlantilla(formation);
  tempPlantilla.id_plantilla = plantilla.id;

  await sql`
    INSERT INTO ${sql(tempPlantillaTable)} (id_plantilla, "PlayersOptions")
    VALUES (${plantilla.id}, ${JSON.stringify(tempPlantilla.playerOptions)})
  `;

  return tempPlantilla;
}

/**
 * Actualiza el JSON de la TempPlantilla (por ejemplo, cuando se modifica el "chosen" en alguna posición).
 * Solo se permite la actualización si la plantilla (draft) aún no está finalizada y dentro del período de edición.
 *
 * @param {number} plantillaId - ID de la plantilla.
 * @param {PositionOptions[]} newData - Nuevo array de PositionOptions para la TempPlantilla.
 * @returns {Promise<void>}
 */
export async function updateTempPlantilla(
  userId: number,
  ligaId: number,
  newData: PositionOptions[],
  roundName?: string
): Promise<void> {
  const currentRound = await getCurrentJornada();
  const nextRound = await getNextJornada();

  if (!currentRound || !nextRound) {
    throw new Error("No se pudieron obtener las jornadas para validar el tiempo de edición");
  }

  /*
  Aconst now = new Date();
  const currentEnd = new Date(currentRound.ending_at);
  const nextStart = new Date(nextRound.starting_at);

  if (now < currentEnd || now >= nextStart) {
    throw new Error("No puedes editar el draft fuera del rango de edición permitido");
  }
  */

  const effectiveRoundName = roundName ?? nextRound.name;

  const [jornadaRecord] = await sql<Round[]>`
    SELECT id FROM ${sql("jornadas")} WHERE name = ${effectiveRoundName} LIMIT 1
  `;
  if (!jornadaRecord) throw new Error("No se encontró la jornada con ese nombre");

  const jornadaId = jornadaRecord.id;

  const [plantilla] = await sql<Plantilla[]>`
    SELECT id, finalized, usuario_id FROM ${sql(plantillaTable)}
    WHERE usuario_id = ${userId} AND liga_id = ${ligaId} AND jornada_id = ${jornadaId}
    LIMIT 1
  `;

  if (!plantilla) throw new Error("No se encontró la plantilla para ese usuario, liga y jornada");
  if (plantilla.finalized) throw new Error("El draft ya está finalizado y no se puede editar");

  await sql`
    UPDATE ${sql(tempPlantillaTable)}
    SET "PlayersOptions" = ${JSON.stringify(newData)}
    WHERE id_plantilla = ${plantilla.id}
  `;
}

/**
 * Guarda la selección final del draft en la tabla 'plantilla_jugadores'.
 * Recorre cada grupo de opciones en la TempPlantilla y, usando el índice elegido (quinto elemento),
 * inserta la relación (plantilla_id, jugador_id). Luego, marca la plantilla como finalizada.
 *
 * @param {TempPlantilla} tempDraft - La TempPlantilla final, donde cada PositionOptions tiene un valor numérico definido en el quinto elemento.
 * @returns {Promise<void>}
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
  await sql`
    UPDATE ${sql(plantillaTable)}
    SET finalized = true
    WHERE id = ${tempDraft.id_plantilla}
  `;
}

/**
 * Obtiene la plantilla (draft) final y sus jugadores ya guardados en la relación.
 * Se busca usando la jornada actual o, si se proporciona roundName, se utiliza ese valor para determinar la jornada.
 * La temporada actual se obtiene directamente mediante una consulta SQL (la última insertada en "seasons").
 *
 * @param {number} userId - ID del usuario.
 * @param {Liga} liga - Objeto Liga, de donde se toma liga.id.
 * @param {string} [roundName] - (Opcional) Nombre de la jornada.
 * @returns {Promise<{ plantilla: Plantilla; players: Player[] }>} - Objeto con la plantilla y un array de jugadores.
 */
export async function getPlantillaWithPlayers(
  userId: number,
  liga: Liga,
  roundName?: string
): Promise<{ plantilla: Plantilla; players: Player[] }> {
  const seasonRes = await sql<Array<{ id: number }>>`
    SELECT id
    FROM ${sql("seasons")}
    ORDER BY id DESC
    LIMIT 1
  `;
  if (seasonRes.length === 0) {
    throw new Error("No se encontró la temporada actual");
  }

  let effectiveRoundName = roundName;
  if (!effectiveRoundName) {
    const currentRound = await getCurrentJornada();
    if (!currentRound) {
      throw new Error("No se encontró la jornada actual");
    }

    effectiveRoundName = currentRound.name;
  }

  const [jornadaRecord] = await sql<Round[]>`
    SELECT id
    FROM ${sql("jornadas")}
    WHERE name = ${effectiveRoundName}
    LIMIT 1
  `;
  if (!jornadaRecord) {
    throw new Error("No se encontró la jornada con ese nombre");
  }

  const jornadaId = jornadaRecord.id;
  const plantillaRes = await sql<Plantilla[]>`
    SELECT *
    FROM ${sql(plantillaTable)}
    WHERE usuario_id = ${userId}
      AND liga_id = ${liga.id}
      AND jornada_id = ${jornadaId}
    LIMIT 1
  `;
  if (plantillaRes.length === 0) {
    throw new Error("No se encontró el draft para esos parámetros");
  }

  const plantilla = plantillaRes[0];
  const players = await sql<Player[]>`
    SELECT j.*
    FROM ${sql(plantillaJugadoresTable)} pj
    JOIN ${sql("jugadores")} j ON pj.jugador_id = j.id
    WHERE pj.plantilla_id = ${plantilla.id}
  `;
  return { plantilla, players };
}

/**
 * Obtiene la TempPlantilla (borrador) asociada a una plantilla (draft) que aún puede ser editada.
 * Se recupera la plantilla por su ID y se valida que se encuentre dentro del período de edición.
 * Se utiliza el campo "PlayersOptions" de la tabla TempPlantilla.
 *
 * @param {number} plantillaId - ID de la plantilla.
 * @returns {Promise<TempPlantilla>} - La TempPlantilla asociada al draft.
 */
export async function getTempDraft(
  userId: number,
  ligaId: number,
  roundName?: string
): Promise<TempPlantilla> {
  const currentRound = await getCurrentJornada();
  const nextRound = await getNextJornada();

  if (!currentRound || !nextRound) {
    throw new Error("No se pudieron obtener las jornadas para validar el tiempo de acceso");
  }

  /*
  Aconst now = new Date();
  const currentEnd = new Date(currentRound.ending_at);
  const nextStart = new Date(nextRound.starting_at);

  if (now < currentEnd || now >= nextStart) {
    throw new Error("Ya no puedes acceder al borrador: fuera del rango de edición");
  }
  */

  const effectiveRoundName = roundName ?? nextRound.name;

  const [jornadaRecord] = await sql<Round[]>`
    SELECT id FROM ${sql("jornadas")} WHERE name = ${effectiveRoundName} LIMIT 1
  `;
  if (!jornadaRecord) throw new Error("No se encontró la jornada con ese nombre");

  const jornadaId = jornadaRecord.id;

  const [plantilla] = await sql<Plantilla[]>`
    SELECT id, finalized FROM ${sql(plantillaTable)}
    WHERE usuario_id = ${userId} AND liga_id = ${ligaId} AND jornada_id = ${jornadaId}
    LIMIT 1
  `;

  if (!plantilla) throw new Error("No existe draft creado para estos parámetros");
  if (plantilla.finalized) throw new Error("Este draft ya fue finalizado y no puede accederse más");

  const [tempDraftRes] = await sql`
    SELECT "PlayersOptions" FROM ${sql(tempPlantillaTable)}
    WHERE id_plantilla = ${plantilla.id}
    LIMIT 1
  `;

  if (!tempDraftRes) throw new Error("No se encontró el borrador asociado a esta plantilla");

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    id_plantilla: plantilla.id,
    playerOptions: tempDraftRes.PlayersOptions as PositionOptions[],
  };
}
