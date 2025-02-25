/**
 * Representa la estructura de los eventos tal y como vienen de la API.
 */
interface ApiEvent {
    type_id: number;
    player_name: string;
    minute: number;
    extra_minute?: number;
    info?: string;
    addition?: string;
    result?: string;
    related_player_id?: number | undefined;
    sort_order?: number;
}
export default ApiEvent;
