import type { ParamInfo } from "./types.js";

const HF_API_BASE = "https://huggingface.co/api/models";
const RATE_LIMIT_DELAY_MS = 500; // Delay between requests to avoid rate limits
const TIMEOUT_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface HFModelInfo {
  safetensors?: {
    total?: number;
    parameters?: Record<string, number>;
  };
  config?: {
    num_parameters?: number;
    num_hidden_layers?: number;
    hidden_size?: number;
  };
  tags?: string[];
  cardData?: {
    license?: string;
  };
}

/**
 * Fetch model info from HuggingFace Hub API.
 * Returns null on any failure (graceful degradation).
 */
async function fetchHFModelInfo(
  hfId: string,
  token?: string,
  verbose?: boolean
): Promise<HFModelInfo | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${HF_API_BASE}/${hfId}`, {
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      if (verbose) console.error(`    Rate limited by HuggingFace, skipping ${hfId}`);
      return null;
    }

    if (!response.ok) {
      if (verbose) console.error(`    HF API returned ${response.status} for ${hfId}`);
      return null;
    }

    return (await response.json()) as HFModelInfo;
  } catch (err) {
    if (verbose) {
      console.error(`    HF fetch failed for ${hfId}: ${err instanceof Error ? err.message : err}`);
    }
    return null;
  }
}

/**
 * Extract parameter count from HuggingFace model metadata.
 * Tries safetensors metadata first, then config.
 */
function extractParamsFromHF(info: HFModelInfo): number | null {
  // Strategy 1: safetensors metadata (most reliable)
  if (info.safetensors?.total) {
    return Math.round((info.safetensors.total / 1e9) * 10) / 10;
  }

  // Strategy 2: safetensors parameters map (sum all)
  if (info.safetensors?.parameters) {
    const total = Object.values(info.safetensors.parameters).reduce(
      (sum, count) => sum + count,
      0
    );
    if (total > 0) {
      return Math.round((total / 1e9) * 10) / 10;
    }
  }

  // Strategy 3: config num_parameters
  if (info.config?.num_parameters) {
    return Math.round((info.config.num_parameters / 1e9) * 10) / 10;
  }

  return null;
}

/**
 * Extract license from HuggingFace model tags.
 */
function extractLicense(info: HFModelInfo): string {
  // Check cardData first
  if (info.cardData?.license) {
    return info.cardData.license;
  }

  // Check tags for license-like entries
  if (info.tags) {
    const licenseTag = info.tags.find(
      (t) =>
        t.startsWith("license:") ||
        t.includes("apache") ||
        t.includes("mit") ||
        t.includes("gpl") ||
        t.includes("cc-")
    );
    if (licenseTag) {
      return licenseTag.replace("license:", "");
    }
  }

  return "";
}

export interface EnrichmentResult {
  params: ParamInfo | null;
  license: string;
}

/**
 * Enrich a single model with data from HuggingFace.
 * Returns verified param counts and license info.
 */
export async function enrichFromHF(
  hfId: string,
  token?: string,
  verbose?: boolean
): Promise<EnrichmentResult> {
  const info = await fetchHFModelInfo(hfId, token, verbose);

  if (!info) {
    return { params: null, license: "" };
  }

  const paramCount = extractParamsFromHF(info);
  const license = extractLicense(info);

  return {
    params: paramCount ? { active: paramCount, total: paramCount } : null,
    license,
  };
}

/**
 * Batch-enrich models from HuggingFace, respecting rate limits.
 * Returns a map of hfId → EnrichmentResult.
 */
export async function batchEnrichFromHF(
  hfIds: Array<{ modelId: string; hfId: string }>,
  token?: string,
  verbose?: boolean
): Promise<Map<string, EnrichmentResult>> {
  const results = new Map<string, EnrichmentResult>();
  const total = hfIds.length;

  if (verbose) {
    console.error(`  Enriching ${total} models from HuggingFace...`);
  }

  for (let i = 0; i < hfIds.length; i++) {
    const { modelId, hfId } = hfIds[i];

    if (verbose && (i + 1) % 10 === 0) {
      console.error(`    Progress: ${i + 1}/${total}`);
    }

    const result = await enrichFromHF(hfId, token, verbose);
    results.set(modelId, result);

    // Rate limit: wait between requests
    if (i < hfIds.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  if (verbose) {
    const enriched = [...results.values()].filter((r) => r.params !== null).length;
    console.error(`  Enriched ${enriched}/${total} models with HF param data`);
  }

  return results;
}
