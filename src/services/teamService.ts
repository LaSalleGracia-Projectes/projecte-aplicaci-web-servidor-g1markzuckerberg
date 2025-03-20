import axios, { type AxiosResponse } from "axios";
import dotenv from "dotenv";
import type Team from "../types/Team";
import { equiposTable } from "../models/EquipoSupabase.js";
import { sql } from "./supabaseService.js"; // Asegúrate de importar sql correctamente
dotenv.config();

const apiToken = process.env.API_TOKEN;
const backendUrl = "http://localhost:3000/api/v1/sportmonks/seasonActual";
const sportmonksApiUrl = "https://api.sportmonks.com/v3/football/teams/seasons/";

// Obtiene la temporada actual desde el backend
async function getSeasonId(): Promise<number> {
    try {
        const response: AxiosResponse<{ season_id: number }> = await axios.get(backendUrl);
        return response.data.season_id;
    } catch (error: any) {
        console.error("Error obteniendo la season_id:", error);
        throw new Error(`Error obteniendo equipos: ${error.message}`);
    }
}

// Obtiene los equipos de la temporada actual
async function getTeamsByCurrentSeason(): Promise<Team[]> {
    try {
        const seasonId = await getSeasonId();
        const response: AxiosResponse<{ data: Array<{ id: number, name: string, image_path: string }> }> =
            await axios.get(`${sportmonksApiUrl}${seasonId}?api_token=${apiToken}`);

        return response.data.data.map(team => ({
            id: team.id,
            name: team.name,
            imagePath: team.image_path
        }));
    } catch (error: any) {
        console.error("Error obteniendo equipos:", error);
        throw new Error(`Error obteniendo equipos: ${error.message}`);
    }
}

async function uploadTeamsToSupabase(teams: Team[]): Promise<void> {
    try {
        const promises = teams.map(async team => 
            sql`
            INSERT INTO ${sql(equiposTable)} (id, name, "imagePath")
            VALUES (${team.id}, ${team.name}, ${team.imagePath})
            ON CONFLICT (id) DO NOTHING
            `
        );

        await Promise.all(promises);
        console.log("Equipos subidos correctamente a Supabase");
    } catch (error: any) {
        console.error("Error subiendo equipos a Supabase:", error);
        throw new Error(`Error subiendo equipos a Supabase: ${error.message}`);
    }
}

export { getTeamsByCurrentSeason, uploadTeamsToSupabase };