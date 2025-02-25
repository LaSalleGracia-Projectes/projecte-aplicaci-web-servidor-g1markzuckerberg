interface EventInfo {
    type: number;
    player: string;
    minute: number;
    extraMinute?: number | undefined;
    description?: string;
    result?: string;
}
export default EventInfo;