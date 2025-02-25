import type Participant from './Participant';
import type Lineup from './Lineup';
import type Statistic from './Statistic';
import type ApiEvent from './ApiEvent';

interface ApiResponse {
    id: number;
    name: string;
    starting_at: string;
    result_info: string;
    participants: Participant[];
    lineups: Lineup[];
    statistics: Statistic[];
    events: ApiEvent[];
}
export default ApiResponse;