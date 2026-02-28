/** Tier classification based on active parameter count */
export type Tier = "edge" | "basic" | "capable" | "strong" | "frontier";

/** Per-model pricing from OpenRouter (USD per token) */
export interface Pricing {
  prompt: number;
  completion: number;
}

/** A processed model entry in the output JSON */
export interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  active_params_b: number;
  total_params_b: number;
  tier: Tier;
  tool_calling: boolean;
  tool_score: number | null;
  ifeval_score: number | null;
  context_length: number;
  quantized_ram_gb: number;
  reasoning: boolean;
  multimodal: boolean;
  license: string;
  pricing: Pricing;
  office_grade: boolean;
}

/** Top-level output schema for data/models.json */
export interface ModelsData {
  metadata: {
    scraped_at: string;
    version: string;
    scraper_version: string;
    total_models: number;
    filtered_count: number;
    max_params_filter: number;
  };
  models: ModelEntry[];
}

/** Inferred parameter counts (active vs total for MoE models) */
export interface ParamInfo {
  active: number;
  total: number;
}

/** Raw model object from OpenRouter /api/v1/models */
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  created?: number;
  hugging_face_id?: string | null;
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
}

/** CLI options for the scraper */
export interface ScraperOptions {
  maxParams: number;
  output: string;
  csv: boolean;
  enrich: boolean;
  verbose: boolean;
}
