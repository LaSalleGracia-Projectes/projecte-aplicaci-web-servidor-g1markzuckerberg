/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import type Fixture from '../types/Fixture';
import type { RoundData } from '../types/RoundData';
import type Event from '../types/Event';
import type LineupPlayer from '../types/LineupPlayer';
import type FixtureResult from '../types/FixtureResult';
dotenv.config();

const apiToken: string = process.env.API_TOKEN ?? '';

// Constantes para posiciones
const POSITION_POR = 24;
const POSITION_DF = 25;
const POSITION_MC = 26;
const POSITION_DL = 27;

/**
 * Interfaz extendida para almacenar la información de cada jugador.
 */
interface PlayerData {
  player_name: string;
  points: number;
  positionId: number;
  starter: boolean;
  team_id: number;
  played: boolean;
}

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
 * Retorna los puntos para un evento según las reglas:
 * - 18: Sustitución (0 puntos, solo marca que jugó)
 * - 16: Penalti marcado: +4 puntos
 * - 15: Asistencia: +3 puntos
 * - 19: Tarjeta amarilla: -1 punto
 * - 20: Falta grave: -3 puntos
 * Otros tipos se ignoran.
 */
export const getPointsForEvent = (event: Event): number => {
  switch (event.type_id) {
    case 18:
      return 0;
    case 16:
      return 4;
    case 15:
      return 3;
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
        if (value >= 10) points -= 2;
        else if (value >= 5) points -= 1;
      }

      break;
    // 41 – Captain se ignora
    case 42: // Shots Total
      if (positionId === POSITION_DL) {
        if (value >= 20) points += 3;
        else if (value >= 15) points += 2;
        else if (value >= 10) points += 1;
        else if (value >= 5) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 20) points += 2;
        else if (value >= 15) points += 1;
      } else if (positionId === POSITION_DF) {
        if (value >= 20) points += 1;
      }

      break;
    case 43: // Attacks
      if (positionId === POSITION_DL) {
        if (value >= 20) points += 3;
        else if (value >= 15) points += 2;
        else if (value >= 10) points += 1;
        else if (value >= 5) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 20) points += 2;
        else if (value >= 15) points += 1;
      } else if (positionId === POSITION_DF) {
        if (value >= 20) points += 1;
      }

      break;
    case 44: // Dangerous Attacks
      if (positionId === POSITION_DL) {
        if (value >= 10) points += 3;
        else if (value >= 7) points += 2;
        else if (value >= 4) points += 1;
        else if (value >= 2) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 10) points += 2;
        else if (value >= 7) points += 1;
      } else if (positionId === POSITION_DF) {
        if (value >= 10) points += 1;
      }
      
      break;
    case 45: // Ball Possession % (solo MC)
      if (positionId === POSITION_MC) {
        if (value >= 65) points += 2;
        else if (value >= 50) points += 1;
        else if (value >= 35) points += 0;
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
      if ((positionId === POSITION_DF || positionId === POSITION_MC || positionId === POSITION_DL) && value >= 10) {
        points += 1;
      }

      break;
    case 78: // Tackles
      if (positionId === POSITION_DF) {
        if (value >= 10) points += 3;
        else if (value >= 7) points += 2;
        else if (value >= 3) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 10) points += 2;
        else if (value >= 7) points += 1;
      }

      break;
    case 80: // Passes
      if (positionId === POSITION_DF) {
        if (value >= 700) points += 3;
        else if (value >= 500) points += 2;
        else if (value >= 400) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 700) points += 5;
        else if (value >= 500) points += 4;
        else if (value >= 400) points += 3;
        else if (value >= 300) points += 2;
        else if (value >= 200) points += 1;
        else if (value >= 100) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_DL) {
        if (value >= 700) points += 3;
        else if (value >= 500) points += 2;
        else if (value >= 400) points += 1;
      }

      break;
    // 81 se ignora
    case 82: // Successful Passes Percentage
      if (positionId === POSITION_DF) {
        if (value >= 87) points += 3;
        else if (value >= 84) points += 2;
        else if (value >= 81) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 87) points += 5;
        else if (value >= 84) points += 4;
        else if (value >= 81) points += 3;
        else if (value >= 78) points += 2;
        else if (value >= 75) points += 1;
        else if (value >= 71) points += 0;
        else points -= 1;
      } else if (positionId === POSITION_DL) {
        if (value >= 87) points += 3;
        else if (value >= 84) points += 2;
        else if (value >= 81) points += 1;
      }

      break;
    // 84 se ignora
    case 86: // Shots On Target
      if (positionId === POSITION_DL) {
        if (value >= 14) points += 3;
        else if (value >= 8) points += 2;
        else if (value >= 4) points += 1;
        else points -= 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 14) points += 2;
        else if (value >= 8) points += 1;
      }

      break;
    case 98: // Total Crosses
      if (positionId === POSITION_MC) {
        if (value >= 10) points += 2;
        else if (value >= 5) points += 1;
      } else if (positionId === POSITION_DL) {
        if (value >= 10) points += 2;
        else if (value >= 5) points += 1;
      }

      break;
    case 99: // Accurate Crosses (solo DL)
      if (positionId === POSITION_DL && value >= 6) {
        points += 1;
      }

      break;
    case 100: // Interceptions
      if (positionId === POSITION_DF) {
        if (value >= 10) points += 3;
        else if (value >= 7) points += 2;
        else if (value >= 3) points += 1;
      } else if (positionId === POSITION_MC) {
        if (value >= 10) points += 2;
        else if (value >= 7) points += 1;
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
        if (value >= 25) points += 1;
      }

      if (positionId === POSITION_MC) {
        if (value >= 25) points += 2;
        else if (value >= 18) points += 1;
        else if (value < 8) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 25) points += 3;
        else if (value >= 18) points += 2;
        else if (value >= 13) points += 1;
        else if (value < 8) points -= 1;
      }

      break;
    case 1605: // Successful Dribbles Percentage
      if (positionId === POSITION_MC) {
        if (value >= 80) points += 1;
        else if (value < 60) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 80) points += 2;
        else if (value >= 70) points += 1;
        else if (value < 60) points -= 1;
      }

      break;
    case 117: // Key Passes
      if (positionId === POSITION_DF) {
        if (value >= 15) points += 1;
      }

      if (positionId === POSITION_MC) {
        if (value >= 15) points += 3;
        else if (value >= 10) points += 2;
        else if (value >= 7) points += 1;
        else if (value <= 3) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 15) points += 1;
        else if (value >= 10) points += 1;
        else if (value <= 3) points -= 1;
      }

      break;
    case 580: // Big Chances Created
      if (positionId === POSITION_MC) {
        if (value >= 15) points += 1;
        else if (value >= 10) points += 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 15) points += 2;
        else if (value >= 10) points += 1;
      }

      break;
    case 581: // Big Chances Missed
      if (positionId === POSITION_MC) {
        if (value >= 15) points -= 1;
      }

      if (positionId === POSITION_DL) {
        if (value >= 15) points -= 2;
        else if (value >= 10) points -= 1;
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
 *  - Sumar/restar puntos según los eventos (utilizando las propiedades correctas).
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
    const starterBonus = (player.type_id === 11) ? 3 : 0;
    playerMap[player.player_id] = {
      player_name: name,
      points: starterBonus,
      positionId: player.position_id || POSITION_MC,
      starter: player.type_id === 11,
      team_id: player.team_id,
      played: true
    };
  });

  // Procesa los eventos
  events.forEach((event: any) => {
    // Se determina el playerId usando related_player_id o buscando por nombre en el mapa
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
      playerMap[playerId].played = true;
    } else {
      const pts = getPointsForEvent(event as Event);
      playerMap[playerId].points += pts;
    }
  });

  // Procesa las estadísticas (la API devuelve un array)
  // Se asume que fixtureResult.statistics es un array de objetos con: type_id, participant_id y data.value
  const statsArray = fixtureResult.statistics as Array<{ type_id: number; participant_id: number; data: { value: number } }>;
  statsArray.forEach((stat) => {
    Object.values(playerMap).forEach((player) => {
      // Se suma la estadística si el jugador pertenece al equipo indicado (participant_id)
      if (player.played && player.team_id === stat.participant_id) {
        const statPoints = getPointsForStat({ type_id: stat.type_id, value: Number(stat.data.value) }, player.positionId);
        player.points += statPoints;
      }
    });
  });

  const results = Object.entries(playerMap).map(([id, data]) => ({
    player_id: Number(id),
    player_name: data.player_name,
    points: data.points,
  }));

  fs.writeFileSync('matchdayFantasyPoints.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Resultados de la jornada guardados en matchdayFantasyPoints.json');
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
  const response = await axios.get(`https://api.sportmonks.com/v3/football/rounds/${roundId}`, {
    params: {
      api_token: apiToken,
      include: 'fixtures'
    }
  });
  const roundData: RoundData = response.data.data;
  const fixtureIds = roundData.fixtures.map((fixture: Fixture) => fixture.id);
  const matchday = parseInt(roundData.name, 10);
  return { fixtureIds, matchday };
};

/**
 * Procesa los puntos fantasy de una ronda completa.
 */
export const processRoundFantasyPoints = async (
  roundId: number
): Promise<Array<{ player_id: number; player_name: string; points: number }>> => {
  const { fixtureIds } = await getFixturesForRound(roundId);
  if (fixtureIds.length === 0) {
    throw new Error(`No se encontraron partidos para la ronda ${roundId}.`);
  }

  return processMatchdayFantasyPoints(fixtureIds);
};
