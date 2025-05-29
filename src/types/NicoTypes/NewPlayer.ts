export type PositionId = 24 | 25 | 26 | 27;

export default interface NewPlayer {
  id: number;
  equipoId: number;
  positionId: PositionId;
  name: string;
  imageUrl: string | null;
}