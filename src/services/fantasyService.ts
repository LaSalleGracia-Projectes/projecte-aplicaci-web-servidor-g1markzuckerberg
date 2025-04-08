/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import axios from 'axios';
import dotenv from 'dotenv';
import type Fixture from '../types/Fixture';
import type { RoundData } from '../types/RoundData';
import type Event from '../types/Event';
import type LineupPlayer from '../types/LineupPlayer';
import type FixtureResult from '../types/FixtureResult';
import type { PlayerData } from '../types/PlayerData';
import { sql } from './supabaseService.js';
import { jugadoresTable } from '../models/PlayerSupabase.js';
import type { Jugador } from '../types/JugadorJornada.js';
dotenv.config();

const apiToken: string = process.env.API_TOKEN ?? '';

// Constantes para posiciones
const POSITION_POR = 24;
const POSITION_DF = 25;
const POSITION_MC = 26;
const POSITION_DL = 27;

/**
 * Obtiene las alineaciones (lineups) directamente del endpoint.
 * Ejemplo de endpoint: https://api.sportmonks.com/v3/football/fixtures/{fixtureId}?api_token=...&include=lineups
 */
export const getFixtureLineups = async (fixtureId: number): Promise<LineupPlayer[]> => {
  const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
    params: {
      api_token: apiToken,
      include: 'lineups'
    }
  });
  const { data } = response.data;
  // La respuesta trae la propiedad "lineups" directamente
  const lineups: LineupPlayer[] = data.lineups || [];
  return lineups;
};

/**
 * Obtiene los eventos del fixture.
 */
export const getFixtureEvents = async (fixtureId: number): Promise<Event[]> => {
  const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
    params: {
      api_token: apiToken,
      include: 'events'
    }
  });
  return response.data.data.events || [];
};

/**
 * Retorna los puntos para un evento (excepto goles, que se gestionan por separado):
 * - 18: Sustitución (0 puntos, solo marca que jugó)
 * - 15: Asistencia: +3 puntos
 * - 16: Penalti marcado: +4 puntos
 * - 19: Tarjeta amarilla: -1 punto
 * - 20: Falta grave: -3 puntos
 * Otros tipos se ignoran.
 *
 * Nota: El evento de gol (type_id 14) se gestiona en el loop de eventos para asignar además la asistencia.
 */
export const getPointsForEvent = (event: Event): number => {
  switch (event.type_id) {
    case 18:
      return 0;
    case 14:
      return 0; // Se gestiona de forma especial en el loop.
    case 15:
      return 3;
    case 16:
      return 4;
    case 19:
      return -1;
    case 20:
      return -3;
    default:
      return 0;
  }
};

/**
 * Calcula puntos según estadísticas aplicando el criterio definido.
 * Se ignoran los stat types indicados con "❌".
 */
const getPointsForStat = ({ type_id, value }: { type_id: number; value: number }, positionId: number): number => {
  let points = 0;
  switch (type_id) {
    case 34: // Offsides (solo DL)
      if (positionId === POSITION_DL) {
        if (value >= 8) points -= 2;
        else if (value >= 4) points -= 1;
      }

      break;
    // 41 – Captain se ignora
    case 42: // Shots Total
      if (positionId === POSITION_DL) {
        if (value >= 26) points += 3;
        else if (value >= 21) points += 2;
        else if (value >= 16) points += 1;
        else if (value >= 11) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 26) points += 1;
        else if (value >= 21) points += 0;
      } else if (positionId === POSITION_DF) {
        if (value >= 26) points += 1;
      }

      break;
    case 43: // Attacks
      if (positionId === POSITION_DL) {
        if (value >= 100) points += 3;
        else if (value >= 90) points += 2;
        else if (value >= 80) points += 1;
        else if (value >= 65) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 90) points += 2;
        else if (value >= 80) points += 1;
      } else if (positionId === POSITION_DF) {
        if (value >= 90) points += 1;
      }

      break;
    case 44: // Dangerous Attacks
      if (positionId === POSITION_DL) {
        if (value >= 48) points += 3;
        else if (value >= 42) points += 2;
        else if (value >= 35) points += 1;
        else if (value >= 27) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 48) points += 2;
        else if (value >= 35) points += 1;
      } else if (positionId === POSITION_DF) {
        if (value >= 48) points += 1;
      }

      break;
    case 45: // Ball Possession % (solo MC)
      if (positionId === POSITION_MC) {
        if (value >= 70) points += 2;
        else if (value >= 55) points += 1;
        else if (value >= 38) points += 0;
        else points -= 1;
      }

      break;

    case 46: // Ball Safe (solo POR)
      if (positionId === POSITION_POR) {
        if (value >= 10) points += 5;
        else if (value >= 8) points += 4;
        else if (value >= 6) points += 3;
        else if (value >= 4) points += 2;
        else if (value >= 2) points += 1;
      }

      break;
    // 47, 49, 50, 52, 53, 54, 55 se ignoran
    case 57: // Saves (solo POR)
      if (positionId === POSITION_POR) {
        if (value >= 10) points += 5;
        else if (value >= 8) points += 4;
        else if (value >= 6) points += 3;
        else if (value >= 4) points += 2;
        else if (value >= 2) points += 1;
      }


      break;
    case 58: // Shots Blocked
      if (positionId === POSITION_DF) {
        if (value >= 20) points += 5;
        else if (value >= 8 && value < 10) points += 4;
        else if (value >= 6 && value < 8) points += 3;
        else if (value >= 4 && value < 6) points += 2;
        else if (value >= 2 && value < 4) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 20) points += 2;
        else if (value >= 8 && value < 10) points += 1;
        else if (value >= 6 && value < 8) points += 1;
      } else if (positionId === POSITION_DL) {
        if (value >= 20) points += 1;
      }

      break;
    // 59 y 64 se ignoran
    case 65: // Successful Headers (DF, MC, DL)
      if ((positionId === POSITION_DF || positionId === POSITION_MC || positionId === POSITION_DL) && value >= 6) {
        points += 1;
      }

      break;
    case 78: // Tackles
      if (positionId === POSITION_DF) {
        if (value >= 25) points += 3;
        else if (value >= 20) points += 2;
        else if (value >= 14) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 25) points += 2;
        else if (value >= 20) points += 1;
      }

      break;
    case 80: // Passes
      if (positionId === POSITION_DF) {
        if (value >= 850) points += 3;
        else if (value >= 650) points += 2;
        else if (value >= 550) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 800) points += 4;
        else if (value >= 600) points += 3;
        else if (value >= 500) points += 2;
        else if (value >= 400) points += 1;
        else if (value >= 300) points += 0;
        else if (value >= 200) points -= 1;
        else points -= 2;
      } else if (positionId === POSITION_DL) {
        if (value >= 850) points += 3;
        else if (value >= 650) points += 2;
        else if (value >= 550) points += 1;
      }

      break;
    // 81 se ignora
    case 82: // Successful Passes Percentage
      if (positionId === POSITION_DF) {
        if (value >= 94) points += 3;
        else if (value >= 90) points += 2;
        else if (value >= 87) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 95) points += 5;
        else if (value >= 92) points += 4;
        else if (value >= 89) points += 3;
        else if (value >= 86) points += 2;
        else if (value >= 83) points += 1;
        else if (value >= 81) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_DL) {
        if (value >= 93) points += 3;
        else if (value >= 88) points += 2;
        else if (value >= 84) points += 1;
      }

      break;
    // 84 se ignora
    case 86: // Shots On Target
      if (positionId === POSITION_DL) {
        if (value >= 16) points += 3;
        else if (value >= 10) points += 2;
        else if (value >= 7) points += 1;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 17) points += 2;
        else if (value >= 12) points += 1;
      }

      break;
    case 98: // Total Crosses
      if (positionId === POSITION_MC) {
        if (value >= 23) points += 2;
        else if (value >= 15) points += 1;
      } else if (positionId === POSITION_DL) {
        if (value >= 20) points += 2;
        else if (value >= 14) points += 1;
      }

      break;
    case 99: // Accurate Crosses (solo DL)
      if (positionId === POSITION_DL && value >= 7) {
        points += 1;
      }

      break;
    case 100: // Interceptions
      if (positionId === POSITION_DF) {
        if (value >= 14) points += 3;
        else if (value >= 10) points += 2;
        else if (value >= 6) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 17) points += 2;
        else if (value >= 14) points += 1;
      }

      break;
    case 106: // Duels Won
      if (positionId === POSITION_DF) {
        if (value >= 60) points += 1;
      }

      if (positionId === POSITION_MC) {
        if (value >= 60) points += 2;
        else if (value >= 55) points += 1;
        else if (value >= 30 && value < 40) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 60) points += 3;
        else if (value >= 55) points += 2;
        else if (value >= 45) points += 1;
        else if (value >= 30 && value < 40) points -= 1;
      }

      break;
    case 108: // Dribble Attempts
      if (positionId === POSITION_DF) {
        if (value >= 30) points += 1;
      }

      if (positionId === POSITION_MC) {
        if (value >= 30) points += 2;
        else if (value >= 20) points += 1;
        else if (value < 8) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 30) points += 3;
        else if (value >= 20) points += 2;
        else if (value >= 13) points += 1;
        else if (value < 8) points -= 1;
      }

      break;
    case 1605: // Successful Dribbles Percentage
      if (positionId === POSITION_MC) {
        if (value >= 77) points += 1;
        else if (value < 50) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 75) points += 2;
        else if (value >= 60) points += 1;
        else if (value < 50) points -= 1;
      }

      break;
    case 117: // Key Passes
      if (positionId === POSITION_DF) {
        if (value >= 13) points += 1;
      }

      if (positionId === POSITION_MC) {
        if (value >= 13) points += 2;
        else if (value >= 10) points += 1;
        else if (value >= 8) points += 0;
        else if (value <= 3) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 13) points += 1;
        else if (value >= 8) points += 0;
        else if (value <= 3) points -= 1;
      }

      break;
    case 580: // Big Chances Created
      if (positionId === POSITION_MC) {
        if (value >= 7) points += 1;
        else if (value >= 4) points += 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 6) points += 2;
        else if (value >= 4) points += 1;
      }

      break;
    case 581: // Big Chances Missed
      if (positionId === POSITION_MC) {
        if (value >= 7) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 7) points -= 2;
        else if (value >= 4) points -= 1;
      }

      break;
    default:
      break;
  }

  return points;
};

/**
 * Procesa un fixture y calcula los puntos fantasy para cada jugador.
 * Se obtienen las alineaciones, eventos y estadísticas para:
 *  - Asignar bono de 3 puntos a los titulares.
 *  - Sumar/restar puntos según los eventos (incluyendo goles y asistencias).
 *  - Marcar como "jugó" al estar en la alineación o ingresar mediante sustitución.
 *  - Sumar puntos de estadísticas (según el criterio definido).
 *  
 * Se removió el bono de clean sheet ya que el endpoint de estadísticas no incluye
 * la información de goles/concedidos ni datos de equipos.
 */
export const processFixtureFantasyPoints = async (
  fixtureId: number
): Promise<Array<{ player_id: number; player_name: string; points: number }>> => {
  const [lineups, events] = await Promise.all([
    getFixtureLineups(fixtureId),
    getFixtureEvents(fixtureId)
  ]);

  // Se consulta el fixture con estadísticas (sin incluir datos de equipos)
  const fixtureResponse = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
    params: { api_token: apiToken, include: 'statistics' }
  });
  const fixtureResult: FixtureResult = fixtureResponse.data.data;

  // Inicializa el mapa de jugadores usando las alineaciones (titulares)
  const playerMap: Record<number, PlayerData> = {};
  lineups.forEach((player: any) => {
    const name = player.player_name || '';
    const isStarter = player.type_id === 11;
  
    playerMap[player.player_id] = {
      player_name: name,
      points: isStarter ? 3 : 0,
      positionId: player.position_id || POSITION_MC,
      starter: isStarter,
      team_id: player.team_id,
      played: isStarter // Jugó solo si fue titular (suplentes aún no han jugado)
    };
  });
  

  // Procesa los eventos
  events.forEach((event: any) => {
    if (event.type_id === 14) {
      // Evento de gol:
      // Al goleador (player_id) se le suman +4
      if (!playerMap[event.player_id]) {
        playerMap[event.player_id] = {
          player_name: event.player_name || '',
          points: 0,
          positionId: POSITION_MC,
          starter: false,
          team_id: event.participant_id,
          played: false,
        };
      }

      playerMap[event.player_id].points += 4;
      // Console.log('Gol procesado de', playerMap[event.player_id].player_name);
      // Al asistente (related_player_id) se le suman +3, si existe
      if (event.related_player_id) {
        if (!playerMap[event.related_player_id]) {
          playerMap[event.related_player_id] = {
            player_name: event.related_player_name || '',
            points: 0,
            positionId: POSITION_MC,
            starter: false,
            team_id: event.participant_id,
            played: false,
          };
        }

        playerMap[event.related_player_id].points += 3;
        // Console.log('Asistencia procesada de', playerMap[event.related_player_id].
        //  player_name);
      }
    } else {
      // Para otros eventos, se determina el jugador a partir de related_player_id o por nombre
      let playerId: number | undefined = event.related_player_id;
      if (!playerId) {
        const found = Object.entries(playerMap).find(([_id, data]) => data.player_name === event.player_name);
        if (found) {
          playerId = Number(found[0]);
        }
      }

      if (!playerId) return;
      if (!playerMap[playerId]) {
        playerMap[playerId] = {
          player_name: event.player_name || '',
          points: 0,
          positionId: POSITION_MC,
          starter: false,
          team_id: event.participant_id,
          played: false,
        };
      }

      if (event.type_id === 18) {
        const enteringPlayerId = event.player_id;
        if (!playerMap[enteringPlayerId]) {
          playerMap[enteringPlayerId] = {
            player_name: event.player_name || '',
            points: 0,
            positionId: POSITION_MC,
            starter: false,
            team_id: event.participant_id,
            played: false,
          };
        }

        playerMap[enteringPlayerId].played = true;
      }
      
    }
  });

// Procesa las estadísticas acumulando puntos en una propiedad temporal
const statsArray = fixtureResult.statistics as Array<{ type_id: number; participant_id: number; data: { value: number } }>;

// Inicializa la propiedad temporal "statPoints" para cada jugador (sin modificar la interfaz final)
Object.values(playerMap).forEach((player) => {
  (player as any).statPoints = 0;
});

// Acumula todos los puntos de estadísticas en "statPoints"
statsArray.forEach((stat) => {
  Object.values(playerMap).forEach((player) => {
    if (player.played && player.team_id === stat.participant_id) {
      const pointsForThisStat = getPointsForStat(
        { type_id: stat.type_id, value: Number(stat.data.value) },
        player.positionId
      );
      (player as any).statPoints = Number((player as any).statPoints) + pointsForThisStat;
    }
  });
});

// Suma los puntos acumulados de estadísticas al total final del jugador
Object.values(playerMap).forEach((player) => {
  if (player.starter) {
    // Si es titular, se suman todos los puntos acumulados
    player.points += Number((player as any).statPoints);
  } else {
    // Si es suplente, se suma la mitad de los puntos acumulados, eliminando el decimal
    player.points += Math.trunc((player as any).statPoints / 2);
  }
});


  const results = Object.entries(playerMap)
  // .filter(([_, data]) => data.played) ❌ quitar esta línea
  .map(([id, data]) => ({
    player_id: Number(id),
    player_name: data.player_name,
    points: data.played ? data.points : 0, // ✅ Si no jugó, puntos = 0
  }));

  const dbPlayers = await getAllDbPlayers();

  const existingIds = new Set(results.map(r => r.player_id));

  dbPlayers.forEach(dbPlayer => {
    if (!existingIds.has(dbPlayer.id)) {
      results.push({
        player_id: dbPlayer.id,
        player_name: dbPlayer.displayName,
        points: 0
      });
    }
  });


  return results;
};

/**
 * Procesa los puntos fantasy de varios fixtures en una jornada.
 */
export const processMatchdayFantasyPoints = async (
  fixtureIds: number[]
): Promise<Array<{ player_id: number; player_name: string; points: number }>> => {
  const fixturesResults = await Promise.all(
    fixtureIds.map(async (fixtureId) => processFixtureFantasyPoints(fixtureId))
  );

  const aggregatedMap: Record<number, { player_name: string; points: number }> = {};
  fixturesResults.forEach((fixtureResults) => {
    fixtureResults.forEach((player) => {
      if (!aggregatedMap[player.player_id]) {
        aggregatedMap[player.player_id] = { player_name: player.player_name, points: 0 };
      }

      aggregatedMap[player.player_id].points += player.points;
    });
  });

  const aggregatedResults = Object.entries(aggregatedMap).map(([id, data]) => ({
    player_id: Number(id),
    player_name: data.player_name,
    points: data.points,
  }));

  return aggregatedResults;
};

/**
 * Obtiene los fixtures de una ronda.
 */
export const getFixturesForRound = async (
  roundId: number
): Promise<{ fixtureIds: number[]; matchday: number }> => {
  try {
    const response = await axios.get(`https://api.sportmonks.com/v3/football/rounds/${roundId}`, {
      params: {
        api_token: apiToken,
        include: 'fixtures'
      }
    });

    const roundData: RoundData | undefined = response.data?.data;

    // Validaciones añadidas aquí:
    if (!roundData?.fixtures) {
      console.warn(`⚠️ No se encontraron fixtures para la ronda ${roundId}.`);
      return { fixtureIds: [], matchday: roundId };
    }

    const fixtureIds = roundData.fixtures.map((fixture: Fixture) => fixture.id);
    const matchday = parseInt(roundData.name, 10);

    return { fixtureIds, matchday };

  } catch (error: any) {
    console.error(`❌ Error en la llamada a la API Sportmonks para la ronda ${roundId}:`, error.response?.data ?? error.message);
    return { fixtureIds: [], matchday: roundId };
  }
};

/**
 * Procesa los puntos fantasy de una ronda completa.
 */
export const processRoundFantasyPoints = async (
  roundId: number
): Promise<Array<{ player_id: number; player_name: string; points: number }>> => {
  const { fixtureIds } = await getFixturesForRound(roundId);

  if (fixtureIds.length === 0) {
    console.warn(`⚠️ No hay partidos disponibles para la ronda ${roundId}.`);
    return [];
  }

  return processMatchdayFantasyPoints(fixtureIds);
};

export async function getAllDbPlayers(): Promise<Array<Pick<Jugador, 'id' | 'displayName'>>> {
  try {
    const jugadores = await sql`
      SELECT id, "displayName" FROM ${sql(jugadoresTable)}
    `;
    return jugadores.map((row: any) => ({ id: row.id, displayName: row.displayName }));
  } catch (error: any) {
    console.error("❌ Error al obtener jugadores de la base de datos:", error);
    throw new Error(`Error leyendo jugadores: ${error.message}`);
  }
}