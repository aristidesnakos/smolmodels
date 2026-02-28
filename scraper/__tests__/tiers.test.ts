import { describe, it, expect } from "vitest";
import { classifyTier, estimateRam, computeOfficeGrade } from "../lib/tiers.js";

describe("classifyTier", () => {
  const cases: Array<[number, string]> = [
    // Edge: < 1B
    [0.5, "edge"],
    [0.1, "edge"],
    [0.99, "edge"],

    // Basic: 1-3B
    [1, "basic"],
    [1.5, "basic"],
    [3, "basic"],

    // Capable: 3-7B (exclusive of 3, inclusive of 7)
    [3.1, "capable"],
    [4, "capable"],
    [7, "capable"],

    // Strong: 7-15B
    [7.1, "strong"],
    [8, "strong"],
    [12, "strong"],
    [14, "strong"],
    [15, "strong"],

    // Frontier: > 15B
    [15.1, "frontier"],
    [22, "frontier"],
    [70, "frontier"],
    [405, "frontier"],
  ];

  it.each(cases)("%sB → %s", (params, expectedTier) => {
    expect(classifyTier(params)).toBe(expectedTier);
  });
});

describe("estimateRam", () => {
  it("0.5B → ~0.8 GB", () => {
    expect(estimateRam(0.5)).toBe(0.8);
  });

  it("3B → ~2.3 GB", () => {
    expect(estimateRam(3)).toBe(2.3);
  });

  it("7B → ~4.7 GB", () => {
    expect(estimateRam(7)).toBe(4.7);
  });

  it("8B → ~5.3 GB", () => {
    expect(estimateRam(8)).toBe(5.3);
  });

  it("12B → ~7.7 GB", () => {
    expect(estimateRam(12)).toBe(7.7);
  });

  it("14B → ~8.9 GB", () => {
    expect(estimateRam(14)).toBe(8.9);
  });

  it("all results should be under 16 GB for ≤15B models", () => {
    expect(estimateRam(15)).toBeLessThanOrEqual(16);
  });
});

describe("computeOfficeGrade", () => {
  it("returns true when all criteria met", () => {
    expect(
      computeOfficeGrade({
        tool_calling: true,
        ifeval_score: 75,
        quantized_ram_gb: 5.3,
      })
    ).toBe(true);
  });

  it("returns false when tool_calling is false", () => {
    expect(
      computeOfficeGrade({
        tool_calling: false,
        ifeval_score: 75,
        quantized_ram_gb: 5.3,
      })
    ).toBe(false);
  });

  it("returns false when ifeval_score is null", () => {
    expect(
      computeOfficeGrade({
        tool_calling: true,
        ifeval_score: null,
        quantized_ram_gb: 5.3,
      })
    ).toBe(false);
  });

  it("returns false when ifeval_score < 65", () => {
    expect(
      computeOfficeGrade({
        tool_calling: true,
        ifeval_score: 60,
        quantized_ram_gb: 5.3,
      })
    ).toBe(false);
  });

  it("returns true when ifeval_score is exactly 65", () => {
    expect(
      computeOfficeGrade({
        tool_calling: true,
        ifeval_score: 65,
        quantized_ram_gb: 5.3,
      })
    ).toBe(true);
  });

  it("returns false when RAM > 16 GB", () => {
    expect(
      computeOfficeGrade({
        tool_calling: true,
        ifeval_score: 75,
        quantized_ram_gb: 18,
      })
    ).toBe(false);
  });

  it("returns true when RAM is exactly 16 GB", () => {
    expect(
      computeOfficeGrade({
        tool_calling: true,
        ifeval_score: 65,
        quantized_ram_gb: 16,
      })
    ).toBe(true);
  });
});
