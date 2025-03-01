/**
 * Representa la estructura transformada del evento para uso interno.
 */
interface EventInfo {
    type: number;
    player: string;
    minute: number;
    extraMinute?: number;
    description?: string;
    result?: string;
    typeId: number;
    relatedPlayerId?: number;
    addition?: string;
    sortOrder?: number;
}
export default EventInfo;
