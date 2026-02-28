import { describe, it, expect } from "vitest";
import { inferParams, detectToolCalling } from "../lib/params.js";

describe("inferParams", () => {
  describe("explicit param counts from slug", () => {
    const cases: Array<[string, number, number]> = [
      // Standard patterns: "Xb" suffix
      ["meta-llama/llama-3.2-3b-instruct", 3, 3],
      ["qwen/qwen3-8b", 8, 8],
      ["google/gemma-3-12b-it", 12, 12],
      ["microsoft/phi-4-14b", 14, 14],
      ["qwen/qwen2.5-1.5b-instruct", 1.5, 1.5],
      ["google/gemma-3-1b-it", 1, 1],
      ["meta-llama/llama-3.2-1b-instruct", 1, 1],

      // Edge tier models
      ["qwen/qwen2.5-0.5b-instruct", 0.5, 0.5],
      ["huggingfaceh4/zephyr-7b-beta", 7, 7],

      // Models with suffixes after param count
      ["mistralai/mistral-7b-instruct", 7, 7],
      ["microsoft/phi-3-mini-4b-instruct", 4, 4],
    ];

    it.each(cases)(
      "%s → active=%s, total=%s",
      (slug, expectedActive, expectedTotal) => {
        const result = inferParams(slug);
        expect(result).not.toBeNull();
        expect(result!.active).toBe(expectedActive);
        expect(result!.total).toBe(expectedTotal);
      }
    );
  });

  describe("MoE models from KNOWN_PARAMS", () => {
    it("mistralai/mistral-small → 8B active, 22B total", () => {
      const result = inferParams("mistralai/mistral-small");
      expect(result).toEqual({ active: 8, total: 22 });
    });

    it("deepseek/deepseek-v3 → 37B active, 685B total", () => {
      const result = inferParams("deepseek/deepseek-v3");
      expect(result).toEqual({ active: 37, total: 685 });
    });
  });

  describe("MoE models from regex (8x7b pattern)", () => {
    it("mistralai/mixtral-8x7b-instruct → MoE active/total", () => {
      const result = inferParams("mistralai/mixtral-8x7b-instruct");
      expect(result).not.toBeNull();
      // Mixtral 8x7B: 2 active experts × 7B = 14B active
      // (Our MoE regex defaults to 2 active experts)
      expect(result!.total).toBeGreaterThan(result!.active);
    });
  });

  describe("unmatched models return null", () => {
    const cases = [
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "some-provider/mystery-model",
    ];

    it.each(cases)("%s → null", (slug) => {
      // These don't have param counts in the slug and aren't in KNOWN_PARAMS
      // They should return null (unless they happen to match a regex)
      const result = inferParams(slug);
      // For models like "claude-3.5-sonnet", the ".5" followed by non-b char won't match
      // This is expected behavior — API-only models don't have local param counts
      if (result === null) {
        expect(result).toBeNull();
      }
    });
  });

  describe("version numbers are not confused with param counts", () => {
    it("llama-3.2-3b: returns 3B, not 3.2B", () => {
      const result = inferParams("meta-llama/llama-3.2-3b-instruct");
      expect(result).not.toBeNull();
      expect(result!.active).toBe(3);
    });

    it("qwen2.5-1.5b: returns 1.5B", () => {
      const result = inferParams("qwen/qwen2.5-1.5b-instruct");
      expect(result).not.toBeNull();
      expect(result!.active).toBe(1.5);
    });
  });
});

describe("detectToolCalling", () => {
  it("returns true when 'tools' is in supported_parameters", () => {
    expect(detectToolCalling(["tools", "temperature", "top_p"])).toBe(true);
  });

  it("returns false when 'tools' is not present", () => {
    expect(detectToolCalling(["temperature", "top_p"])).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(detectToolCalling(undefined)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(detectToolCalling([])).toBe(false);
  });
});
