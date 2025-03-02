import type PlayerApiResponse from './PlayerAPIResponse';

interface LineupPlayer extends PlayerApiResponse {
    type_id: number;
    statistics?: Array<{ type_id: number; value: number }>;
}
export default LineupPlayer;