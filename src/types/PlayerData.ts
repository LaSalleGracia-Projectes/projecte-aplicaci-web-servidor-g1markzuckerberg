/**
 * Interfaz extendida para almacenar la información de cada jugador.
 */
export interface PlayerData {
    player_name: string;
    points: number;
    positionId: number;
    starter: boolean;
    team_id: number;
    played: boolean;
}