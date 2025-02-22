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

/**
 * Obtiene los jugadores de los alineaciones de un fixture.
 */
export const getFixtureLineups = async (fixtureId: number): Promise<LineupPlayer[]> => {
  const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
    params: {
      api_token: apiToken,
      include: 'lineups.player;statistics'
    }
  });

  return response.data.data.lineups;
};

/**
 * Obtiene los eventos de un fixture.
 */
export const getFixtureEvents = async (fixtureId: number): Promise<Event[]> => {
  const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
    params: {
      api_token: apiToken,
      include: 'events'
    }
  });

  return response.data.data.events;
};

/**
 * Calcula los puntos de un evento según las reglas establecidas.
 */
export const getPointsForEvent = (event: Event, positionId = 26): number => {
  let pts = 0;
  if (event.type_id === 14) {
    if (positionId === 24 || positionId === 25) {
      pts += 6;
    } else if (positionId === 26) {
      pts += 5;
    } else if (positionId === 27) {
      pts += 4;
    }
  } else if (event.type_id === 15) {
    pts += 3;
  } else if (event.type_id === 19) {
    pts -= 1;
  } else if (event.type_id === 20) {
    pts -= 3;
  }

  return pts;
};

/**
 * Procesa un fixture y calcula los puntos fantasy para cada jugador.
 * Se obtiene la alineación (lineups), los eventos y los datos del fixture (resultado)
 * para aplicar la lógica:
 *   - Bono de 3 puntos si es titular (type_id === 11).
 *   - Suma o resta de puntos según eventos.
 *   - Bono de clean sheet para jugadores que hayan jugado (solo titulares) si su equipo no concedió goles.
 *
 * El resultado es un array de objetos con: player_id, player_name y points.
 */
export const processFixtureFantasyPoints = async (
  fixtureId: number
): Promise<Array<{ player_id: number; player_name: string; points: number }>> => {
  const [lineups, events] = await Promise.all([
    getFixtureLineups(fixtureId),
    getFixtureEvents(fixtureId)
  ]);

  const fixtureResponse = await axios.get(`https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`, {
    params: { api_token: apiToken }
  });

  const fixtureResult: FixtureResult = fixtureResponse.data.data;
  const { home_score, away_score, home_team_id, away_team_id } = fixtureResult;

  const playerMap: Record<number, { player_name: string; points: number; positionId: number; starter: boolean; team_id: number }> = {};

  lineups.forEach((player: LineupPlayer) => {
    const starterBonus = player.type_id === 11 ? 3 : 0;
    playerMap[player.id] = {
      player_name: player.display_name ?? '',
      points: starterBonus,
      positionId: player.position_id || 26,
      starter: player.type_id === 11,
      team_id: player.team_id
    };
  });

  events.forEach((event: Event) => {
    const playerId = event.player_id;
    if (!playerMap[playerId]) {
      playerMap[playerId] = {
        player_name: event.player_name || '',
        points: 0,
        positionId: 26,
        starter: false,
        team_id: event.participant_id
      };
    }

    const pts = getPointsForEvent(event, playerMap[playerId].positionId);
    playerMap[playerId].points += pts;
  });

  for (const player of Object.values(playerMap)) {
    if (player.starter && ((player.team_id === home_team_id && away_score === 0) || (player.team_id === away_team_id && home_score === 0))) {
      if (player.positionId === 24) {
        player.points += 5;
      } else if (player.positionId === 25) {
        player.points += 4;
      } else if (player.positionId === 26) {
        player.points += 2;
      } else if (player.positionId === 27) {
        player.points += 1;
      }
    }
  }

  const results = Object.entries(playerMap).map(([id, data]) => ({
    player_id: Number(id),
    player_name: data.player_name,
    points: data.points
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
    points: data.points
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
