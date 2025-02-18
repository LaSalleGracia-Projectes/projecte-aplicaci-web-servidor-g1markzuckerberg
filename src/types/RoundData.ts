import type Fixture from "./Fixture";

export interface RoundData {
  id: number;
  name: string;
  fixtures: Fixture[];
}