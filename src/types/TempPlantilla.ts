import type Player from "../models/Player";

export type PositionOptions = [
  InstanceType<typeof Player>,
  InstanceType<typeof Player>,
  InstanceType<typeof Player>,
  InstanceType<typeof Player>,
  number | undefined
];

interface TempPlantilla {
  id_plantilla: number;
  playerOptions: PositionOptions[];
}

export default TempPlantilla;