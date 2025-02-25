interface Round {
    is_current: boolean;
    name: string;
    season_id: number;
    id: number;
    starting_at: Date;
    ending_at: Date;
}

export default Round;