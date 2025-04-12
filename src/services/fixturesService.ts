/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import axios, { type AxiosResponse } from "axios";
import { roundMapping } from "../constants/roundMapping.js";
import type Fixture from "../types/Fixture.js";
import type { RoundsApiResponse } from "../types/RoundsApiResponse.js";
import dotenv from "dotenv";
dotenv.config();
import type Round from "../types/Round.js";
const apiToken = process.env.API_TOKEN;
import type FixtureExtended from "../types/FixtureExtended.js";

/**
 * Normaliza un nombre: convierte a minúsculas y remueve acentos
 */
function normalizeName(name: string): string {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Enriquecer un fixture con las imágenes de los equipos.
 * Se obtiene el detalle del fixture (incluyendo lineups) para extraer los team_id.
 * Luego se consulta cada equipo para obtener sus detalles y se compara el nombre
 * obtenido con el que se espera (tomado de fixture.name, que tiene formato "Local vs Visitante").
 */
async function enrichFixture(fixture: Fixture): Promise<FixtureExtended> {
    // Obtener detalles del fixture incluyendo los lineups
    const fixtureDetailsUrl = `https://api.sportmonks.com/v3/football/fixtures/${fixture.id}?api_token=${apiToken}&include=lineups`;
    const detailsResponse = await axios.get(fixtureDetailsUrl);
    const { data: { data: { lineups } } } = detailsResponse;

    // Extraer los team_id únicos de los lineups
    const teamIds: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    lineups.forEach((lineup: any) => {
        const teamId = Number(lineup.team_id);
        if (!isNaN(teamId) && !teamIds.includes(teamId)) {
            teamIds.push(teamId);
        }
    });

    // Separar el nombre del fixture para obtener los nombres esperados de local y visitante
    let localTeamNameExpected = "";
    let visitantTeamNameExpected = "";
    if (fixture.name.includes(" vs ")) {
        const parts = fixture.name.split(" vs ");
        localTeamNameExpected = parts[0].trim();
        visitantTeamNameExpected = parts[1].trim();
    }

    const localExpected = normalizeName(localTeamNameExpected);
    const visitantExpected = normalizeName(visitantTeamNameExpected);

    // Función auxiliar para obtener los detalles de un equipo
    async function getTeamDetails(teamId: number) {
        const teamUrl = `https://api.sportmonks.com/v3/football/teams/${teamId}?api_token=${apiToken}`;
        const response = await axios.get(teamUrl);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return response.data.data;
    }

    // Obtener en paralelo los detalles de cada equipo
    const teamsDetails = await Promise.all(teamIds.map(getTeamDetails));

    let local_team_image = "";
    let visitant_team_image = "";

    teamsDetails.forEach((team: any) => {
        const teamNameNormalized = normalizeName(String(team.name));
        // Se asigna si el nombre del equipo contiene el nombre esperado
        if (localExpected && teamNameNormalized.includes(localExpected)) {
            local_team_image = team.image_path;
        }

        if (visitantExpected && teamNameNormalized.includes(visitantExpected)) {
            visitant_team_image = team.image_path;
        }
    });

    // Fallback en caso de que la comparación no funcione: usar el orden obtenido
    if (!local_team_image && teamsDetails[0]) {
        local_team_image = teamsDetails[0].image_path;
    }

    if (!visitant_team_image && teamsDetails[1]) {
        visitant_team_image = teamsDetails[1].image_path;
    }

    // Retornar solo los campos requeridos
    return {
        id: fixture.id,
        name: fixture.name,
        result_info: fixture.result_info,
        starting_at_timestamp: fixture.starting_at_timestamp,
        local_team_image,
        visitant_team_image,
    };
}

/**
 * Función principal que obtiene los fixtures de una jornada (usando el mapeo existente)
 * y los enriquece con las imágenes de los equipos.
 */
async function getFixturesByRoundNumber(roundNumber: string): Promise<FixtureExtended[]> {
    const roundId = roundMapping[roundNumber];
    if (!roundId) {
        throw new Error(`No se encontró una jornada con el número: ${roundNumber}`);
    }

    const url = `https://api.sportmonks.com/v3/football/rounds/${roundId}?api_token=${apiToken}&include=fixtures`;
    const response: AxiosResponse<RoundsApiResponse> = await axios.get(url);
    const { fixtures } = response.data.data;

    const enrichedFixtures = await Promise.all(fixtures.map(async (fixture: Fixture) => enrichFixture(fixture)));
    return enrichedFixtures;
}
/**
 * Obtiene la jornada actual en curso dentro de la temporada activa.
 *
 * @returns {Promise<Round[]>} Un array con la jornada actual si existe, o un array vacío si no hay jornada activa.
 */

async function getCurrentRounds(): Promise<Round[]> {
    // Obtener el ID de la temporada actual
    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
        console.error("No se pudo obtener el id de la temporada actual");
        return [];
    }

    // Construir la URL utilizando el seasonId obtenido
    const url = `https://api.sportmonks.com/v3/football/rounds/seasons/${seasonId}?api_token=${apiToken}`;

    try {
        const response = await axios.get<{ data: Round[] }>(url);
        const currentRound = response.data.data.find((round: Round) => round.is_current);

        if (currentRound) {
            return [{
                name: currentRound.name,
                id: currentRound.id,
                season_id: currentRound.season_id,
                is_current: currentRound.is_current,
                starting_at: currentRound.starting_at,
                ending_at: currentRound.ending_at
            }];
        }

        return []; // Devuelve un array vacío si no hay jornada actual
    } catch (error) {
        console.error('Error al obtener la jornada actual:', error.response?.data || error.message);
        return [];
    }
}

/**
 * Obtiene el ID de la temporada actual de La Liga desde la API de Sportmonks.
 *
 * @returns {Promise<number | undefined>} El ID de la temporada actual si existe, o `undefined` en caso de error.
 */
async function getCurrentSeasonId(): Promise<number | undefined> {
    const url = `https://api.sportmonks.com/v3/football/leagues/564?api_token=${apiToken}&include=currentSeason`;

    try {
        const response = await axios.get(url);
        const seasonId: number | undefined = response.data.data?.currentseason?.id;

        return seasonId ?? undefined;
    } catch (error) {
        console.error("Error al obtener la temporada actual:", error.response?.data || error.message);
        return undefined;
    }
}

/**
 * Obtiene todas las jornadas (rounds) de una temporada específica.
 *
 * @param {number} seasonId - ID de la temporada.
 * @returns {Promise<Round[]>} Lista de jornadas de la temporada solicitada.
 */
async function getRoundsBySeasonId(seasonId: number): Promise<Round[]> {
    const url = `https://api.sportmonks.com/v3/football/rounds/seasons/${seasonId}?api_token=${apiToken}`;

    try {
        const response = await axios.get<{ data: Round[] }>(url);
        return response.data.data.map((round: Round) => ({
            name: round.name,
            id: round.id,
            season_id: round.season_id,
            is_current: round.is_current,
            starting_at: round.starting_at,
            ending_at: round.ending_at
        }));
    } catch (error) {
        console.error("❌ Error al obtener las jornadas de la temporada:", error.response?.data || error.message);
        throw new Error("Error al obtener las jornadas de la temporada.");
    }
}

export { getFixturesByRoundNumber, getCurrentRounds, getCurrentSeasonId, getRoundsBySeasonId };
