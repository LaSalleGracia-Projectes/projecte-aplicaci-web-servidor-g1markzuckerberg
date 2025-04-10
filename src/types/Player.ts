export default interface Player {
    id: number;
    displayName: string;
    positionId: number;
    imagePath: string;
    estrellas?: number;
    puntos_totales?: number;
    teamId: number;
    teamName?: string;   // Nombre del equipo
    teamImage?: string; 
}