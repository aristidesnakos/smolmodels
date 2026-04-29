import { describe, it, expect } from "vitest";
import { deduplicateFreeModels } from "../lib/openrouter.js";
import type { OpenRouterModel } from "../lib/types.js";

function makeModel(id: string): OpenRouterModel {
  return { id, name: id, context_length: 4096 };
}

describe("deduplicateFreeModels", () => {
  it("removes :free variant when base model exists", () => {
    const models = [
      makeModel("google/gemma-3-12b-it"),
      makeModel("google/gemma-3-12b-it:free"),
    ];
    const result = deduplicateFreeModels(models);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("google/gemma-3-12b-it");
  });

  it("keeps :free variant when no base model exists", () => {
    const models = [makeModel("provider/some-model:free")];
    const result = deduplicateFreeModels(models);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("provider/some-model:free");
  });

  it("keeps non-free models unchanged", () => {
    const models = [
      makeModel("provider/model-a"),
      makeModel("provider/model-b"),
    ];
    const result = deduplicateFreeModels(models);
    expect(result).toHaveLength(2);
  });

  it("handles mixed list with multiple duplicates", () => {
    const models = [
      makeModel("nvidia/nemotron-3-super-120b-a12b"),
      makeModel("nvidia/nemotron-3-super-120b-a12b:free"),
      makeModel("nvidia/nemotron-nano-12b-v2-vl"),
      makeModel("nvidia/nemotron-nano-12b-v2-vl:free"),
      makeModel("provider/free-only-model:free"),
    ];
    const result = deduplicateFreeModels(models);
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.id)).toEqual([
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-nano-12b-v2-vl",
      "provider/free-only-model:free",
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateFreeModels([])).toEqual([]);
  });
});
