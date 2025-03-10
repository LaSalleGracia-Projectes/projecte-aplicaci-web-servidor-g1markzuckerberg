import axios, { type AxiosResponse } from "axios";
import dotenv from "dotenv";
dotenv.config();

const apiToken = process.env.API_TOKEN;
const backendUrl = "http://localhost:3000/api/v1/sportmonks/seasonActual";
const sportmonksApiUrl = "https://api.sportmonks.com/v3/football/teams/seasons/";

// Obtiene la temporada actual desde el backend
async function getSeasonId(): Promise<number> {
    try {
        const response: AxiosResponse<{ season_id: number }> = await axios.get(backendUrl);
        return response.data.season_id;
    } catch (error) {
        console.error("Error obteniendo la season_id:", error);
        throw new Error(`Error obteniendo equipos: ${error.message}`);
    }
}

// Obtiene los equipos de la temporada actual
async function getTeamsByCurrentSeason() {
    try {
        const seasonId = await getSeasonId();
        const response: AxiosResponse<{ data: Array<{ id: number, name: string, image_path: string }> }> = await axios.get(
            `${sportmonksApiUrl}${seasonId}?api_token=${apiToken}`
        );
        
        return response.data.data.map(team => ({
            id: team.id,
            name: team.name,
            imagePath: team.image_path
        }));
    } catch (error) {
        console.error("Error obteniendo equipos:", error);
        throw new Error(`Error obteniendo equipos: ${error.message}`);
    }
}

export { getTeamsByCurrentSeason };