import axios, { type AxiosResponse } from "axios";
import type PlayerApiResponse from "../types/PlayerAPIResponse";
import type SquadApiResponse from "../types/SquadAPIResponse";
import type Player from "../types/Player";
import dotenv from "dotenv";
dotenv.config();

const apiToken = process.env.API_TOKEN;
const backendUrl = "http://localhost:3000/api/v1/sportmonks/seasonActual";
const sportmonksApiUrl = "https://api.sportmonks.com/v3/football/teams/seasons/";

/**
 * Obtiene la temporada actual desde el backend.
 * @returns {Promise<number>} ID de la temporada actual.
 */
async function getSeasonId(): Promise<number> {
    try {
        const response: AxiosResponse<{ season_id: number }> = await axios.get(backendUrl);
        return response.data.season_id;
    } catch (error) {
        console.error("Error obteniendo la season_id:", error);
        throw new Error(String(error));
    }
}

/**
 * Obtiene los equipos de la temporada actual.
 * @returns {Promise<Array<{ id: number, name: string, imagePath: string }>>} Lista de equipos con ID, nombre e imagen.
 */
async function getTeamIds(seasonId: number): Promise<number[]> {
    try {
        const response: AxiosResponse<{ data: Array<{ id: number }> }> = await axios.get(
            `${sportmonksApiUrl}${seasonId}?api_token=${apiToken}`
        );
        return response.data.data.map(team => team.id);
    } catch (error) {
        console.error("Error obteniendo los equipos de la temporada:", error);
        throw new Error(String(error));
    }
}

async function getPlayersFromTeam(teamId: number): Promise<Player[]> {
    try {
        const squadResponse: AxiosResponse<{ data: SquadApiResponse[] }> = await axios.get<{ data: SquadApiResponse[] }>(
            `https://api.sportmonks.com/v3/football/squads/teams/${teamId}?api_token=${apiToken}`
        );

        const players = squadResponse.data.data;

        const playerDetailsPromises = players.map(async (player) => {
            const playerResponse = await axios.get<{ data: PlayerApiResponse }>(
                `https://api.sportmonks.com/v3/football/players/${player.player_id}?api_token=${apiToken}`
            );

            const playerData = playerResponse.data.data;

            return {
                id: playerData.id,
                teamId,
                positionId: playerData.position_id,
                displayName: playerData.display_name ?? "",
                imagePath: playerData.image_path ?? "",
            };
        });

        const playerDetails = await Promise.all(playerDetailsPromises);
        return playerDetails as Player[];
    } catch (error) {
        console.error(`Error obteniendo jugadores del equipo ${teamId}:`, error);
        return [];
    }
}

async function getAllPlayersFromTeams(): Promise<Player[]> {
    try {
        const seasonId = await getSeasonId();
        const teamIds = await getTeamIds(seasonId);

        const allPlayers: Player[] = await Promise.all(
            teamIds.map(async (teamId): Promise<Player[]> => {
                const playersOfTeam: Player[] = await getPlayersFromTeam(teamId);
                return playersOfTeam;
            })
        ).then((results: Player[][]): Player[] => results.flat());

        return allPlayers;
    } catch (error) {
        console.error("Error en la obtención de jugadores:", error);
        return [];
    }
}

export { getAllPlayersFromTeams };
