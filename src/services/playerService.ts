import axios, { type AxiosResponse } from "axios";
import { sql } from "./supabaseService.js";
import type PlayerApiResponse from "../types/PlayerAPIResponse.js";
import type SquadApiResponse from "../types/SquadAPIResponse.js";
import type Player from "../types/Player.js";
import dotenv from "dotenv";
import { jugadoresTable } from "../models/PlayerSupabase.js";
import { jugadoresEquipos } from "../models/JugadorEquipoSeason.js";
import { equiposTable } from "../models/EquipoSupabase.js";
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

async function uploadPlayersToSupabase(players: Player[]): Promise<void> {
    try {
    const promises = players.map(async player => sql`
        INSERT INTO ${sql(jugadoresTable)} (id, "displayName", "positionId", "imagePath", estrellas, puntos_totales)
        VALUES (
            ${player.id},
            ${player.displayName},
            ${player.positionId},
            ${player.imagePath},
            ${player.estrellas ?? 1},
            ${player.puntos_totales ?? 0}
        )
        ON CONFLICT (id) DO NOTHING
    `);

    await Promise.all(promises);
    console.log("✅ Jugadores subidos correctamente a Supabase");
    } catch (error: any) {
        console.error("Error subiendo jugadores a Supabase:", error);
        throw new Error(`Error subiendo jugadores a Supabase: ${error.message}`);
    }
}

// 6. Inserta la relación en la tabla "jugadores_equipos_season"
/**
 * Inserta la relación entre jugador, equipo y temporada en la tabla "jugadores_equipos_season".
 * Se requiere que la tabla tenga una restricción UNIQUE en (jugador_id, equipo_id, season_id)
 * para que la cláusula ON CONFLICT funcione correctamente.
 *
 * @param players - Lista de jugadores, cada uno debe tener la propiedad teamId.
 * @param seasonId - ID de la temporada actual.
 */
async function uploadJugadorEquipoSeasonRelation(players: Player[], seasonId: number): Promise<void> {
    try {
        const promises = players.map(async (player) => {
        // Verificar si ya existe la relación para este jugador, equipo y temporada
        const existing = await sql`
            SELECT 1 FROM ${sql(jugadoresEquipos)}
            WHERE jugador_id = ${player.id} 
            AND equipo_id = ${player.teamId} 
            AND season_id = ${seasonId}
            LIMIT 1
        `;
        // Si no existe, se inserta la relación
        if (existing.length === 0) {
            return sql`
                INSERT INTO ${sql(jugadoresEquipos)} (jugador_id, equipo_id, season_id)
                VALUES (${player.id}, ${player.teamId}, ${seasonId})
            `;
        }
    });

    await Promise.all(promises);
    console.log("✅ Relación jugador-equipo-temporada insertada correctamente.");
    } catch (error: any) {
        console.error("Error subiendo relación jugador-equipo-temporada:", error);
        throw new Error(`Error subiendo relación jugador-equipo-temporada: ${error.message}`);
    }
}

/**
 * Obtiene todos los jugadores desde Supabase, incluyendo información del equipo (nombre e imagen).
 * @returns {Promise<any[]>} Lista de jugadores con sus respectivos datos de equipo.
 */
async function getAllPlayersFromSupabase(
    sortPoints?: 'up' | 'down',
    teamName?: string
  ): Promise<any[]> {
    try {
      // Condición de filtrado por equipo
      const whereTeam = teamName
        ? sql`WHERE e.name = ${teamName}`
        : sql``;
  
      // Cláusula ORDER BY para puntos
      const orderPoints = sortPoints === 'up'
        ? sql`ORDER BY j.puntos_totales ASC`
        : sortPoints === 'down'
        ? sql`ORDER BY j.puntos_totales DESC`
        : sql``;
  
      const query = sql`
        SELECT 
          j.id, 
          j."displayName", 
          j."positionId", 
          j."imagePath"     AS "playerImage",
          j.puntos_totales  AS "points",
          j.estrellas       AS "estrellas",      -- <-- añadimos estrellas
          e.id              AS "teamId",
          e.name            AS "teamName",
          e."imagePath"     AS "teamImage"
        FROM ${sql(jugadoresTable)} j
        JOIN ${sql(jugadoresEquipos)} jes ON j.id = jes.jugador_id
        JOIN ${sql(equiposTable)}    e   ON e.id = jes.equipo_id
        ${whereTeam}
        ${orderPoints}
      `;
  
      const players = await sql`${query}`;
      return players;
    } catch (error: any) {
      throw new Error(`Error obteniendo jugadores de Supabase: ${error.message}`);
    }
}

/**
 * Obtiene un jugador por su ID desde Supabase.
 * @param {number} playerId - ID del jugador.
 * @returns {Promise<Player | undefined>} Jugador o undefined si no se encuentra.
 */
/**
 * Obtiene un jugador por su ID desde Supabase, e incluye info del equipo.
 * @param {number} playerId - ID del jugador.
 * @returns {Promise<any>} Jugador (con info de equipo) o undefined si no se encuentra.
 */
async function getPlayerByIdFromSupabase(playerId: number): Promise<any> {
    try {
      const [player] = await sql`
        SELECT 
          j.id, 
          j."displayName", 
          j."positionId", 
          j."imagePath" AS "playerImage",
          j."puntos_totales" AS "points",         -- <-- añadimos puntos
          j.estrellas,
          e.id        AS "teamId",
          e.name      AS "teamName",
          e."imagePath" AS "teamImage"
        FROM ${sql(jugadoresTable)} j
        JOIN ${sql(jugadoresEquipos)} jes ON j.id = jes.jugador_id
        JOIN ${sql(equiposTable)} e ON e.id = jes.equipo_id
        WHERE j.id = ${playerId}
        LIMIT 1
      `;
  
      return player;
    } catch (error: any) {
      throw new Error(`Error obteniendo jugador con id ${playerId} de Supabase: ${error.message}`);
    }
  }

export { getAllPlayersFromTeams, uploadPlayersToSupabase, uploadJugadorEquipoSeasonRelation,
    getAllPlayersFromSupabase, getPlayerByIdFromSupabase };
