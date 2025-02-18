import axios, { type AxiosResponse } from "axios";
import type PlayerApiResponse from "../types/PlayerAPIResponse";
import type SquadApiResponse from "../types/SquadAPIResponse";
import dotenv from "dotenv";
dotenv.config();

const apiToken = process.env.API_TOKEN;

// 👇 Array con IDs de equipos
const teamIds = [
    83,    // FC Barcelona
    3468,  // Real Madrid
    7980,  // Atlético
    13258, // Athletic
    3477,  // Villarreal
    377,   // Rayo Vallecano
    594,   // Real Sociedad
    231,   // Girona
    459,   // Osasuna
    645,   // Mallorca
    485,   // Real Betis
    36,    // Celta de Vigo
    676,   // Sevilla
    106,   // Getafe
    2921,  // Las Palmas
    528,   // Espanyol
    844,   // Leganés
    214,   // Valencia
    2975,  // Deportivo Alavés
    361    // Real Valladolid
];

async function getPlayersFromTeam(teamId: number) {
    try {
        // 1. Obtener la lista de jugadores (plantilla) del equipo
        const squadResponse: AxiosResponse<{ data: SquadApiResponse[] }> = await axios.get<{ data: SquadApiResponse[] }>(
            `https://api.sportmonks.com/v3/football/squads/teams/${teamId}?api_token=${apiToken}`
        );

        const players = squadResponse.data.data;

        // 2. Obtener información detallada de cada jugador
        const playerDetailsPromises = players.map(async (player) => {
            const playerResponse = await axios.get<{ data: PlayerApiResponse }>(
                `https://api.sportmonks.com/v3/football/players/${player.player_id}?api_token=${apiToken}`
            );

            const playerData = playerResponse.data.data;

            // Convertimos (opcionalmente) a camelCase
            return {
                _id: playerData.id,
                teamId,
                positionId: playerData.position_id,
                displayName: playerData.display_name,
                imagePath: playerData.image_path,
                points: []
            };
        });

        // Esperamos a que finalicen todas las llamadas
        const formattedPlayers = await Promise.all(playerDetailsPromises);
        return formattedPlayers;
    } catch (error) {
        console.error(`Error obteniendo jugadores del equipo ${teamId}:`, error);
        return [];
    }
}

async function getAllPlayersFromTeams() {
    const allPlayers: any[] = [];

    for (const teamId of teamIds) {
        // eslint-disable-next-line no-await-in-loop
        const playersOfTeam = await getPlayersFromTeam(teamId);
        allPlayers.push(...playersOfTeam);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return allPlayers;
}

export { getAllPlayersFromTeams };