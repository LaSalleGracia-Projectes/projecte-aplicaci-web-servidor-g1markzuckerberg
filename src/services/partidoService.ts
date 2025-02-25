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
import type TeamInfo from "../types/partido/TeamInfo";

dotenv.config();
const apiToken = process.env.API_TOKEN;

/**
 * Obtiene las estadísticas completas de un partido específico.
 *
 * @async
 * @function getMatchStatistics
 * @param {number} roundId - ID de la jornada.
 * @param {number} fixtureId - ID del partido.
 * @returns {Promise<MatchStatistics | undefined>} Objeto con las estadísticas del partido o `undefined` en caso de error.
 */
export async function getMatchStatistics(
    roundId: number,
    fixtureId: number
): Promise<MatchStatistics | undefined> {
    const url = `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}?api_token=${apiToken}&include=events;statistics;lineups;participants`;

    try {
        const response = await axios.get<{ data: ApiResponse }>(url);
        const { data } = response.data;

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

        // Filtra y formatea la alineación de los equipos
        const filterLineup = (teamId: number | undefined): PlayerInfo[] =>
            teamId
                ? data.lineups
                    .filter((p: Lineup) => p.team_id === teamId)
                    .map((p: Lineup) => ({
                        name: p.player_name,
                        number: p.jersey_number,
                        position: p.position_id,
                        isStarter: p.type_id === 11, // Titular (11) o suplente (12)
                    }))
                : [];

        const homeLineup = filterLineup(homeTeamId);
        const awayLineup = filterLineup(awayTeamId);

        // Organiza las estadísticas por equipo
        const statistics: Record<number, Record<number, number>> =
            data.statistics.reduce(
                (stats: Record<number, Record<number, number>>, stat: Statistic) => {
                    const teamId = stat.participant_id;
                    const typeId = stat.type_id;
                    const { value } = stat.data;

                    if (!stats[teamId]) stats[teamId] = {};
                    stats[teamId][typeId] = value;

                    return stats;
                },
                {}
            );

        // Transforma los eventos de ApiEvent a EventInfo
        const events: EventInfo[] = data.events.map((event: ApiEvent) => ({
            type: event.type_id,
            player: event.player_name,
            minute: event.minute,
            extraMinute: event.extra_minute ?? null,
            description: event.info,
            result: event.result,
        }));

        const matchStats: MatchStatistics = {
            fixtureId: data.id,
            name: data.name,
            // eslint-disable-next-line object-shorthand
            roundId: roundId,
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
    } catch (error: any) {
        console.error(
            "Error al obtener estadísticas:",
            error.response?.data || error.message
        );
        return undefined;
    }
}
