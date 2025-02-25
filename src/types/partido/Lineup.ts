interface Lineup {
    team_id: number;
    player_name: string;
    jersey_number: number;
    position_id: number;
    type_id: number; // 11 = titular, 12 = suplente
}
export default Lineup;