import type EventInfo from './EventInfo';
import type TeamInfo from './TeamInfo';
interface MatchStatistics {
    fixtureId: number;
    name: string;
    roundId: number;
    date: string;
    resultInfo: string;
    teams: {
        home: TeamInfo;
        away: TeamInfo;
    };
    events: EventInfo[];
    statistics: Record<number, Record<number, number>>; // ID del equipo → { tipo de estadística → valor }
}
export default MatchStatistics;