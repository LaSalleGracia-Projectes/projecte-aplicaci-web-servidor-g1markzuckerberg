interface FixtureResult {
    home_score: number;
    away_score: number;
    home_team_id: number;
    away_team_id: number;
    statistics: Array<{ type_id: number; participant_id: number; data: { value: number } }>;

}
export default FixtureResult;