import axios from "axios";
import dotenv from "dotenv";
import type ApiResponse from "../types/partido/ApiResponse";
import type MatchStatistics from "../types/partido/MatchStatistics";
import type EventInfo from "../types/partido/EventInfo";
import type Participant from "../types/partido/Participant";
import type Lineup from "../types/partido/Lineup";
import type Statistic from "../types/partido/Statistic";
import type ApiEvent from "../types/partido/ApiEvent";
import type PlayerInfo from "../types/partido/PlayerInfo";

dotenv.config();
const apiToken = process.env.API_TOKEN;

/**
 * Realiza la llamada a la API de SportMonks y retorna los datos del fixture.
 * @param {number} fixtureId - ID del fixture.
 * @returns {Promise<ApiResponse | undefined>} Los datos del fixture o undefined en caso de error.
 */
async function fetchFixtureData(fixtureId: number): Promise<ApiResponse | undefined> {
    const url = `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}?api_token=${apiToken}&include=events;statistics;lineups;participants`;
    try {
        const response = await axios.get<{ data: ApiResponse }>(url);
        return response.data.data;
    } catch (error: any) {
        console.error(
            "Error al obtener datos del fixture:",
            error.response?.data || error.message
        );
        return undefined;
    }
}

/**
 * Mapea la alineación para un equipo dado.
 * @param {Lineup[]} lineups - Array de objetos de alineación.
 * @param {number | undefined} teamId - ID del equipo.
 * @returns {PlayerInfo[]} La alineación mapeada para el equipo.
 */
function mapLineup(lineups: Lineup[], teamId: number | undefined): PlayerInfo[] {
    if (!teamId) return [];
    return lineups
        .filter((p: Lineup) => p.team_id === teamId)
        .map((p: Lineup) => ({
            playerId: p.player_id,
            teamId: p.team_id,
            name: p.player_name,
            number: p.jersey_number,
            position: p.position_id,
            isStarter: p.type_id === 11, // Titular (11) o suplente (12)
            positionField: p.formation_field,
            positionPosition: p.formation_position,
        }));
}

/**
 * Organiza las estadísticas por equipo.
 * @param {Statistic[]} statistics - Array de estadísticas.
 * @returns {Record<number, Record<number, number>>} Estadísticas organizadas por ID de equipo y tipo de estadística.
 */
function mapStatistics(statistics: Statistic[]): Record<number, Record<number, number>> {
    return statistics.reduce((acc: Record<number, Record<number, number>>, stat: Statistic) => {
        const teamId = stat.participant_id;
        const typeId = stat.type_id;
        const { value } = stat.data;
        if (!acc[teamId]) acc[teamId] = {};
        acc[teamId][typeId] = value;
        return acc;
    }, {});
}

/**
 * Transforma los eventos del API (ApiEvent) a la estructura EventInfo.
 * @param {ApiEvent[]} events - Array de eventos del API.
 * @returns {EventInfo[]} Array de eventos mapeados.
 */
function mapEvents(events: ApiEvent[]): EventInfo[] {
    return events.map((event: ApiEvent) => ({
        type: event.type_id,
        player: event.player_name,
        minute: event.minute,
        extraMinute: event.extra_minute ?? undefined,
        description: event.info,
        result: event.result,
        typeId: event.type_id,
        relatedPlayerId: event.related_player_id ?? undefined,
        addition: event.addition ?? undefined,
        sortOrder: event.sort_order ?? undefined,
    }));
}

/**
 * Obtiene las estadísticas completas de un partido específico.
 * @param {number} fixtureId - ID del partido.
 * @returns {Promise<MatchStatistics | undefined>} Objeto con las estadísticas del partido o undefined en caso de error.
 */
async function getMatchStatistics(fixtureId: number): Promise<MatchStatistics | undefined> {
    const data = await fetchFixtureData(fixtureId);
    if (!data) return undefined;

    // Identifica a los equipos local y visitante
    const homeTeam = data.participants.find(
        (team: Participant) => team.meta.location === "home"
    );
    const awayTeam = data.participants.find(
        (team: Participant) => team.meta.location === "away"
    );

    const homeTeamId = homeTeam ? homeTeam.id : undefined;
    const awayTeamId = awayTeam ? awayTeam.id : undefined;

    // Mapea las alineaciones, estadísticas y eventos usando las funciones auxiliares
    const homeLineup = mapLineup(data.lineups, homeTeamId);
    const awayLineup = mapLineup(data.lineups, awayTeamId);
    const statistics = mapStatistics(data.statistics);
    const events = mapEvents(data.events);

    const matchStats: MatchStatistics = {
        fixtureId: data.id,
        name: data.name,
        date: data.starting_at,
        resultInfo: data.result_info,
        teams: {
            home: {
                teamId: homeTeamId,
                name: homeTeam ? homeTeam.name : "Unknown",
                lineup: homeLineup,
            },
            away: {
                teamId: awayTeamId,
                name: awayTeam ? awayTeam.name : "Unknown",
                lineup: awayLineup,
            },
        },
        events,
        statistics,
    };

    return matchStats;
}

export { getMatchStatistics };