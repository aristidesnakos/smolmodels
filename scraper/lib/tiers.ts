import type { Tier, ModelEntry, OpenRouterModel, ParamInfo } from "./types.js";
import { inferParams, detectToolCalling } from "./params.js";

/**
 * Classify a model into a tier based on active parameter count.
 */
export function classifyTier(activeParamsB: number): Tier {
  if (activeParamsB < 1) return "edge";
  if (activeParamsB <= 3) return "basic";
  if (activeParamsB <= 7) return "capable";
  if (activeParamsB <= 15) return "strong";
  return "frontier";
}

/**
 * Estimate RAM required for Q4_K_M quantization.
 * Rule of thumb: ~0.6 GB per billion parameters + 0.5 GB overhead for KV cache.
 */
export function estimateRam(activeParamsB: number): number {
  return Math.round((activeParamsB * 0.6 + 0.5) * 10) / 10;
}

/**
 * Compute whether a model meets the "office-grade" threshold.
 * office_grade = tool_calling AND ifeval_score >= 65 AND quantized_ram_gb <= 16
 */
export function computeOfficeGrade(model: {
  tool_calling: boolean;
  ifeval_score: number | null;
  quantized_ram_gb: number;
}): boolean {
  return (
    model.tool_calling &&
    model.ifeval_score !== null &&
    model.ifeval_score >= 65 &&
    model.quantized_ram_gb <= 16
  );
}

/**
 * Extract provider/org from the model ID.
 * e.g., "meta-llama/llama-3.2-3b-instruct" → "meta-llama"
 */
function extractProvider(modelId: string): string {
  const slash = modelId.indexOf("/");
  return slash > 0 ? modelId.substring(0, slash) : "unknown";
}

/**
 * Detect if a model has reasoning/chain-of-thought capabilities.
 * Heuristic: check for common reasoning indicators in the model name/id.
 */
function detectReasoning(model: OpenRouterModel): boolean {
  const lower = (model.id + " " + model.name).toLowerCase();
  return (
    lower.includes("reason") ||
    lower.includes("-r1") ||
    lower.includes("-r-") ||
    lower.includes("think") ||
    lower.includes("cot") ||
    lower.includes("deepthink") ||
    lower.includes("qwq")
  );
}

/**
 * Detect if a model accepts image input (multimodal).
 */
function detectMultimodal(model: OpenRouterModel): boolean {
  const inputModalities = model.architecture?.input_modalities;
  if (inputModalities && inputModalities.includes("image")) return true;

  // Fallback: check model name for vision indicators
  const lower = (model.id + " " + model.name).toLowerCase();
  return lower.includes("vision") || lower.includes("-vl");
}

/**
 * Parse pricing strings from OpenRouter to numbers.
 * OpenRouter returns pricing as strings like "0.0002".
 */
function parsePricing(model: OpenRouterModel): {
  prompt: number;
  completion: number;
} {
  return {
    prompt: parseFloat(model.pricing?.prompt ?? "0") || 0,
    completion: parseFloat(model.pricing?.completion ?? "0") || 0,
  };
}

/**
 * Transform a raw OpenRouter model into a processed ModelEntry.
 * Returns null if params can't be determined.
 */
export function processModel(
  raw: OpenRouterModel,
  paramOverride?: ParamInfo
): ModelEntry | null {
  const params = paramOverride ?? inferParams(raw.id);
  if (!params) return null;

  const toolCalling = detectToolCalling(raw.supported_parameters);
  const ramGb = estimateRam(params.active);

  const entry: ModelEntry = {
    id: raw.id,
    name: raw.name,
    provider: extractProvider(raw.id),
    active_params_b: params.active,
    total_params_b: params.total,
    tier: classifyTier(params.active),
    tool_calling: toolCalling,
    tool_score: null, // Not available from OpenRouter
    ifeval_score: null, // Not available from OpenRouter
    context_length: raw.context_length,
    quantized_ram_gb: ramGb,
    reasoning: detectReasoning(raw),
    multimodal: detectMultimodal(raw),
    license: "", // Will be enriched from HuggingFace if available
    pricing: parsePricing(raw),
    office_grade: false, // Computed below
  };

  entry.office_grade = computeOfficeGrade(entry);

  return entry;
}
