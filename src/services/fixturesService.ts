/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import axios, { type AxiosResponse } from "axios";
import { roundMapping } from "../constants/roundMapping.js";
import type Fixture from "../types/Fixture.js";
import type { RoundsApiResponse } from "../types/RoundsApiResponse.js";
import dotenv from "dotenv";
dotenv.config();
import type  Round from "../types/Round.js";
const apiToken = process.env.API_TOKEN;

/**
 * Obtiene los fixtures (partidos) de una jornada específica de la Liga.
 *
 * @param {string} roundNumber - Número de la jornada a consultar.
 * @returns {Promise<Fixture[]>} Lista de fixtures de la jornada solicitada.
 * @throws {Error} Si el número de jornada no existe en el mapeo.
 */
async function getFixturesByRoundNumber(roundNumber: string): Promise<Fixture[]> {
    // Buscar el ID de la jornada a partir del número
    const roundId = roundMapping[roundNumber];
    if (!roundId) {
        throw new Error(`No se encontró una jornada con el número: ${roundNumber}`);
    }

    // Construir la URL
    const url = `https://api.sportmonks.com/v3/football/rounds/${roundId}?api_token=${apiToken}&include=fixtures`;

    // Hacer la petición con Axios, tipando la respuesta
    const response: AxiosResponse<RoundsApiResponse> = await axios.get<RoundsApiResponse>(url);

    // Extraer la propiedad fixtures (asegúrate de que tu interfaz RoundData la tenga)
    const { fixtures } = response.data.data;

    // Mapear los fixtures tipando el parámetro para evitar el error "implicitly has an 'any' type"
    return fixtures.map((fixture: Fixture) => ({
        id: fixture.id,
        name: fixture.name,
        result_info: fixture.result_info,
        starting_at_timestamp: fixture.starting_at_timestamp
    }));
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
