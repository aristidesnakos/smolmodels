import type { OpenRouterModel } from "./types.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all models from OpenRouter's public API.
 * Retries with exponential backoff on failure.
 */
export async function fetchModels(
  verbose: boolean = false
): Promise<OpenRouterModel[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (verbose && attempt > 1) {
        console.error(`  Retry attempt ${attempt}/${MAX_RETRIES}...`);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(OPENROUTER_API_URL, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `OpenRouter API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = (await response.json()) as { data: OpenRouterModel[] };

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error(
          "Unexpected API response: missing 'data' array"
        );
      }

      if (verbose) {
        console.error(`  Fetched ${data.data.length} models from OpenRouter`);
      }

      return data.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        if (verbose) {
          console.error(
            `  Request failed: ${lastError.message}. Retrying in ${delay}ms...`
          );
        }
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed to fetch from OpenRouter after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}
