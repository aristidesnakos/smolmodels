import type { ModelsData } from "./types";
import rawData from "../../data/models.json";

export function loadModelsData(): ModelsData {
  return rawData as unknown as ModelsData;
}
