export interface Jugador {
  id: number;
  displayName: string;
  positionId?: string;
  imagePath?: string;
  estrellas?: number;
  puntos_totales?: number;
}