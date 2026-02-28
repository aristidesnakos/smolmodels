import type { ParamInfo } from "./types.js";

/**
 * Curated lookup table for models whose param count can't be inferred from the name.
 * Key is the OpenRouter model slug (e.g., "mistralai/mistral-small").
 * Values are { active, total } in billions.
 */
export const KNOWN_PARAMS: Record<string, ParamInfo> = {
  // Mistral MoE models
  "mistralai/mistral-small": { active: 8, total: 22 },
  "mistralai/mistral-small-24b-instruct-2501": { active: 8, total: 22 },
  "mistralai/mistral-medium": { active: 12, total: 36 },
  "mistralai/ministral-3b": { active: 3, total: 3 },
  "mistralai/ministral-8b": { active: 8, total: 8 },

  // DeepSeek MoE (out of scope but listed for completeness)
  "deepseek/deepseek-v3": { active: 37, total: 685 },
  "deepseek/deepseek-r1": { active: 37, total: 671 },
  "deepseek/deepseek-v2.5": { active: 21, total: 236 },

  // Step Function models
  "step-fun/step-3.5-flash": { active: 11, total: 196 },

  // Cohere
  "cohere/command-r": { active: 35, total: 35 },
  "cohere/command-r-plus": { active: 104, total: 104 },
  "cohere/command-r7b-12-2024": { active: 7, total: 7 },
};

/**
 * Known MoE (Mixture of Experts) models with expert routing info.
 * Maps slug patterns to { experts_total, experts_active, expert_size_b }.
 */
const MOE_PATTERNS: Array<{
  pattern: RegExp;
  experts_active: number;
  expert_size_b: number;
  total_b: number;
}> = [
  // Mixtral 8x7B: 8 experts, 2 active, each 7B params → ~12.9B active, ~46.7B total
  {
    pattern: /mixtral-8x7b/i,
    experts_active: 2,
    expert_size_b: 7,
    total_b: 46.7,
  },
  // Mixtral 8x22B
  {
    pattern: /mixtral-8x22b/i,
    experts_active: 2,
    expert_size_b: 22,
    total_b: 141,
  },
];

/**
 * Regex patterns to extract parameter counts from model slugs.
 * Ordered by specificity — first match wins.
 */
const PARAM_REGEXES: Array<{
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => ParamInfo;
}> = [
  // MoE pattern: "8x7b" → delegate to MOE_PATTERNS for active/total split
  {
    pattern: /(\d+)x(\d+(?:\.\d+)?)[bB]/,
    extract: (match) => {
      const numExperts = parseInt(match[1]);
      const expertSize = parseFloat(match[2]);
      // Default: assume 2 active experts (common for Mixtral-style MoE)
      const active = 2 * expertSize;
      const total = numExperts * expertSize;
      return { active: round(active), total: round(total) };
    },
  },
  // Explicit param count: "8b", "1.5b", "12b-it", "0.5b"
  // Must be preceded by a separator and followed by separator, end-of-string, or colon
  {
    pattern:
      /(?:^|[-/_:])(\d+(?:\.\d+)?)[bB](?:[-/_:]|$)/,
    extract: (match) => {
      const params = parseFloat(match[1]);
      return { active: params, total: params };
    },
  },
];

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Find all regex matches for param-like patterns in a slug,
 * and return the one that looks most like a param count (not a version number).
 */
function extractParamsFromSlug(slug: string): ParamInfo | null {
  // First try MoE-specific patterns (these are unambiguous)
  for (const moe of MOE_PATTERNS) {
    if (moe.pattern.test(slug)) {
      return {
        active: round(moe.experts_active * moe.expert_size_b),
        total: moe.total_b,
      };
    }
  }

  // Split slug into parts by "/" to get model name portion
  const parts = slug.split("/");
  const modelPart = parts[parts.length - 1]; // e.g., "llama-3.2-3b-instruct"

  // Find all "Xb" patterns in the model name portion
  const allMatches: Array<{ value: number; index: number }> = [];
  const scanRegex = /(\d+(?:\.\d+)?)[bB](?=[-/_:]|$)/g;
  let scanMatch: RegExpExecArray | null;

  while ((scanMatch = scanRegex.exec(modelPart)) !== null) {
    allMatches.push({
      value: parseFloat(scanMatch[1]),
      index: scanMatch.index,
    });
  }

  if (allMatches.length === 0) return null;

  // If there's only one match, use it
  if (allMatches.length === 1) {
    const v = allMatches[0].value;
    return { active: v, total: v };
  }

  // Multiple matches: prefer the last one (version numbers tend to come first)
  // e.g., "llama-3.2-3b" → "3.2" is version, "3" is params
  // But also check: if a match is clearly a param range (0.5-200), prefer it
  const last = allMatches[allMatches.length - 1];
  return { active: last.value, total: last.value };
}

/**
 * Infer parameter counts for a model.
 * Strategy: KNOWN_PARAMS lookup → regex extraction → null.
 */
export function inferParams(modelId: string): ParamInfo | null {
  // 1. Check curated lookup table first
  if (KNOWN_PARAMS[modelId]) {
    return KNOWN_PARAMS[modelId];
  }

  // 2. Check if any KNOWN_PARAMS key is a prefix of or contained in the modelId
  for (const [key, info] of Object.entries(KNOWN_PARAMS)) {
    if (modelId.startsWith(key) || modelId.includes(key.split("/").pop()!)) {
      // Only match if the known key's model name is a substantial part
      const knownModelName = key.split("/").pop()!;
      if (knownModelName.length > 5 && modelId.includes(knownModelName)) {
        return info;
      }
    }
  }

  // 3. Try regex extraction from the slug
  return extractParamsFromSlug(modelId);
}

/**
 * Detect if a model supports tool/function calling.
 * Checks the supported_parameters array from OpenRouter.
 */
export function detectToolCalling(
  supportedParameters?: string[]
): boolean {
  if (!supportedParameters) return false;
  return supportedParameters.includes("tools");
}
