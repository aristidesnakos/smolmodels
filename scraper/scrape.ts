import { parseArgs } from "node:util";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchModels } from "./lib/openrouter.js";
import { inferParams } from "./lib/params.js";
import { processModel } from "./lib/tiers.js";
import { batchEnrichFromHF, type EnrichmentResult } from "./lib/huggingface.js";
import type { ModelEntry, ModelsData, ScraperOptions, ParamInfo } from "./lib/types.js";

const SCRAPER_VERSION = "0.1.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseCliArgs(): ScraperOptions {
  const { values } = parseArgs({
    options: {
      "max-params": { type: "string", default: "15" },
      output: { type: "string", default: resolve(__dirname, "../data/models.json") },
      csv: { type: "boolean", default: false },
      enrich: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
    },
  });

  return {
    maxParams: parseFloat(values["max-params"] as string),
    output: values.output as string,
    csv: values.csv as boolean,
    enrich: values.enrich as boolean,
    verbose: values.verbose as boolean,
  };
}

function modelsToCsv(models: ModelEntry[]): string {
  const headers = [
    "id",
    "name",
    "provider",
    "active_params_b",
    "total_params_b",
    "tier",
    "tool_calling",
    "tool_score",
    "ifeval_score",
    "context_length",
    "quantized_ram_gb",
    "reasoning",
    "multimodal",
    "license",
    "pricing_prompt",
    "pricing_completion",
    "office_grade",
  ];

  const rows = models.map((m) =>
    [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      m.provider,
      m.active_params_b,
      m.total_params_b,
      m.tier,
      m.tool_calling,
      m.tool_score ?? "",
      m.ifeval_score ?? "",
      m.context_length,
      m.quantized_ram_gb,
      m.reasoning,
      m.multimodal,
      `"${m.license}"`,
      m.pricing.prompt,
      m.pricing.completion,
      m.office_grade,
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

async function main() {
  const opts = parseCliArgs();

  if (opts.verbose) {
    console.error("smolmodels scraper v" + SCRAPER_VERSION);
    console.error(`  Max params: ${opts.maxParams}B`);
    console.error(`  Output: ${opts.output}`);
    console.error(`  Enrich from HF: ${opts.enrich}`);
    console.error("");
  }

  // Step 1: Fetch all models from OpenRouter
  if (opts.verbose) console.error("Step 1: Fetching models from OpenRouter...");
  const rawModels = await fetchModels(opts.verbose);

  // Step 2: Optionally enrich from HuggingFace
  let hfEnrichments: Map<string, EnrichmentResult> | null = null;

  if (opts.enrich) {
    if (opts.verbose) console.error("\nStep 2: Enriching from HuggingFace...");

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken && opts.verbose) {
      console.error("  Warning: HF_TOKEN not set. Using anonymous access (rate limited).");
    }

    // Collect models that have a HuggingFace ID
    const hfModels = rawModels
      .filter((m) => m.hugging_face_id)
      .map((m) => ({ modelId: m.id, hfId: m.hugging_face_id! }));

    if (opts.verbose) {
      console.error(`  ${hfModels.length} models have HuggingFace IDs`);
    }

    hfEnrichments = await batchEnrichFromHF(hfModels, hfToken, opts.verbose);
  }

  // Step 3: Process models
  if (opts.verbose) console.error("\nStep 3: Processing models...");

  const processedModels: ModelEntry[] = [];
  let unmatchedCount = 0;

  for (const raw of rawModels) {
    // Get enrichment data if available
    const enrichment = hfEnrichments?.get(raw.id);

    // Use HF params if enrichment succeeded, otherwise fall back to regex
    let paramOverride: ParamInfo | undefined;
    if (enrichment?.params) {
      paramOverride = enrichment.params;
    }

    const entry = processModel(raw, paramOverride);

    if (!entry) {
      unmatchedCount++;
      if (opts.verbose) {
        console.error(`  Unmatched (no params): ${raw.id}`);
      }
      continue;
    }

    // Apply license from HF enrichment
    if (enrichment?.license) {
      entry.license = enrichment.license;
    }

    // Filter by max active params
    if (entry.active_params_b <= opts.maxParams) {
      processedModels.push(entry);
    }
  }

  // Sort by active params descending, then by name
  processedModels.sort((a, b) => {
    if (b.active_params_b !== a.active_params_b) {
      return b.active_params_b - a.active_params_b;
    }
    return a.name.localeCompare(b.name);
  });

  if (opts.verbose) {
    console.error(`  Total from API: ${rawModels.length}`);
    console.error(`  Unmatched (no params): ${unmatchedCount}`);
    console.error(`  After filtering (≤${opts.maxParams}B): ${processedModels.length}`);
    console.error("");
  }

  // Step 4: Build output
  const output: ModelsData = {
    metadata: {
      scraped_at: new Date().toISOString(),
      version: "1.0",
      scraper_version: SCRAPER_VERSION,
      total_models: rawModels.length,
      filtered_count: processedModels.length,
      max_params_filter: opts.maxParams,
    },
    models: processedModels,
  };

  // Step 5: Write output
  const outputPath = resolve(opts.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  if (opts.verbose) {
    console.error(`Wrote ${processedModels.length} models to ${outputPath}`);
  }

  // Optional CSV output
  if (opts.csv) {
    const csvPath = outputPath.replace(/\.json$/, ".csv");
    writeFileSync(csvPath, modelsToCsv(processedModels));
    if (opts.verbose) {
      console.error(`Wrote CSV to ${csvPath}`);
    }
  }

  // Summary to stdout
  console.log(
    JSON.stringify({
      total_from_api: rawModels.length,
      unmatched: unmatchedCount,
      filtered: processedModels.length,
      output: outputPath,
    })
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
