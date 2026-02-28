export type Tier = "edge" | "basic" | "capable" | "strong" | "frontier";

export interface Pricing {
  prompt: number;
  completion: number;
}

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
