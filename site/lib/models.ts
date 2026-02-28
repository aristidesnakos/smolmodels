import { readFileSync } from "fs";
import { join } from "path";
import type { ModelsData } from "./types";

export function loadModelsData(): ModelsData {
  const filePath = join(process.cwd(), "..", "data", "models.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ModelsData;
}
