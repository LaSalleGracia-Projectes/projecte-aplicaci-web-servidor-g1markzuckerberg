import type PlayerInfo from './PlayerInfo';
interface TeamInfo {
    teamId: number | undefined;
    name: string;
    lineup: PlayerInfo[];
}
export default TeamInfo;