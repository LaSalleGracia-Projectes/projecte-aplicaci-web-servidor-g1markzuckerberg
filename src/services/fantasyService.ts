/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import type Fixture from '../types/Fixture';
import type PlayerApiResponse from '../types/PlayerAPIResponse';
import type { RoundData } from '../types/RoundData';
dotenv.config();

const apiToken: string = process.env.API_TOKEN ?? '';

// La interfaz SquadApiResponse no la usamos directamente en este código.

// Creamos una interfaz extendida para los jugadores del lineup, ya que necesitamos 'type_id'
interface LineupPlayer extends PlayerApiResponse {
  type_id: number;
}

// Definimos la interfaz para los eventos (no provista, la creamos aquí)
interface Event {
  player_id: number;
  type_id: number;
  participant_id: number;
  player_name: string;
}

// Interfaz para los datos de resultado del fixture (no disponible en Fixture)
interface FixtureResult {
  home_score: number;
  away_score: number;
  home_team_id: number;
  away_team_id: number;
}

async function getFixtureLineups(fixtureId: number): Promise<LineupPlayer[]> {
  const response = await axios.get(
    `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`,
    {
      params: {
        api_token: apiToken,
        include: 'lineups.player;statistics'
      }
    }
  );
  return response.data.data.lineups;
}

async function getFixtureEvents(fixtureId: number): Promise<Event[]> {
  const response = await axios.get(
    `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`,
    {
      params: {
        api_token: apiToken,
        include: 'events'
      }
    }
  );
  return response.data.data.events;
}

function getPointsForEvent(event: Event, positionId = 26): number {
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
}

async function processFixtureFantasyPoints(
  fixtureId: number,
): Promise<{ player_id: number; player_name: string; points: number }[]> {
  try {
    const [lineups, events] = await Promise.all([
      getFixtureLineups(fixtureId),
      getFixtureEvents(fixtureId)
    ]);

    const fixtureResponse = await axios.get(
      `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}`,
      {
        params: { api_token: apiToken } // eslint-disable-line @typescript-eslint/naming-convention
      }
    );
    const fixtureResult: FixtureResult = fixtureResponse.data.data;
    const { home_score, away_score, home_team_id, away_team_id } = fixtureResult;

    // Creamos un mapa para almacenar jugadores
    const playerMap: Record<
      number,
      { player_name: string; points: number; positionId: number; starter: boolean; team_id: number }
    > = {};

    if (lineups && Array.isArray(lineups)) {
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
    }

    if (events && Array.isArray(events)) {
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
    }

    // Se aplica bono de clean sheet SOLO a los jugadores que hayan jugado (starter true)
    for (const [id,player] of Object.entries(playerMap)) {
      if (
        player.starter &&
        ((player.team_id === home_team_id && away_score === 0) ||
          (player.team_id === away_team_id && home_score === 0))
      ) {
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
  } catch (error) {
    console.error('Error processing fantasy points:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function processMatchdayFantasyPoints(
  fixtureIds: number[]
): Promise<{ player_id: number; player_name: string; points: number }[]> {
  try {
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
    fs.writeFileSync('matchdayFantasyPoints.json', JSON.stringify(aggregatedResults, null, 2), 'utf-8');
    console.log('Resultados de la jornada guardados en matchdayFantasyPoints.json');
    return aggregatedResults;
  } catch (error) {
    console.error('Error processing matchday fantasy points:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function getFixturesForRound(
  roundId: number
): Promise<{ fixtureIds: number[]; matchday: number }> {
  const response = await axios.get(
    `https://api.sportmonks.com/v3/football/rounds/${roundId}`,
    {
      params: {
        api_token: apiToken,
        include: 'fixtures'
      }
    }
  );
  const roundData: RoundData = response.data.data;
  const fixtureIds = roundData.fixtures.map((fixture: Fixture) => fixture.id);
  const matchday = parseInt(roundData.name, 10);
  return { fixtureIds, matchday };
}

async function processRoundFantasyPoints(
  roundId: number
): Promise<{ player_id: number; player_name: string; points: number }[]> {
  const { fixtureIds } = await getFixturesForRound(roundId);
  if (fixtureIds.length === 0) {
    throw new Error(`No se encontraron partidos para la ronda ${roundId}.`);
  }

  return await processMatchdayFantasyPoints(fixtureIds);
}

export {
  processFixtureFantasyPoints,
  processMatchdayFantasyPoints,
  processRoundFantasyPoints
};
