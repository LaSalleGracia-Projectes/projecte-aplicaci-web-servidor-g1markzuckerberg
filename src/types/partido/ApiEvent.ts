interface ApiEvent {
    type_id: number;
    player_name: string;
    minute: number;
    extra_minute?: number | undefined;
    info?: string;
    addition?: string;
    result?: string;
}
export default ApiEvent;