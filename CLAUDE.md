# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

smolmodels is a TypeScript data pipeline that tracks small language models (≤15B active params) suitable for local deployment. It scrapes model metadata from OpenRouter's public API, infers parameter counts, classifies models into tiers, optionally enriches from HuggingFace, and outputs version-controlled JSON (`data/models.json`).

## Commands

```bash
npm install                # Install dependencies
npm test                   # Run all tests (vitest run)
npm run test:watch         # Watch mode
npm run scrape             # Run scraper (output: data/models.json)
npm run scrape:verbose     # With detailed stderr logging
npm run scrape:enrich      # Enrich from HuggingFace (optional HF_TOKEN env var)
npx tsx scraper/scrape.ts --max-params 8 --output custom.json --csv  # Custom options
```

Run a single test file: `npx vitest run scraper/__tests__/params.test.ts`

## Architecture

```
scraper/scrape.ts          # Main entry: CLI args → fetch → enrich → process → output
scraper/lib/types.ts       # TypeScript interfaces (ModelEntry, OpenRouterModel, ScraperOptions)
scraper/lib/params.ts      # Parameter inference: KNOWN_PARAMS lookup table → regex extraction
scraper/lib/tiers.ts       # Classification: tier assignment, RAM estimation, office-grade computation
scraper/lib/openrouter.ts  # OpenRouter API client with retry/backoff
scraper/lib/huggingface.ts # HuggingFace batch enrichment (verified params + licenses)
scraper/__tests__/         # Vitest tests for params and tiers
```

**Pipeline flow:** Parse CLI → Fetch from OpenRouter → (optional) Enrich from HuggingFace → For each model: inferParams → classifyTier → estimateRam → detectCapabilities → computeOfficeGrade → Sort → Write JSON/CSV

## Key Domain Concepts

- **Tiers** (by active params): edge (<1B), basic (1–3B), capable (3–7B), strong (7–15B), frontier (>15B, out of scope)
- **Office-grade**: `tool_calling AND ifeval_score ≥ 65 AND quantized_ram_gb ≤ 16`
- **RAM estimation** (Q4_K_M quant): `(active_params_b × 0.6) + 0.5` GB
- **MoE models**: Track both active and total params (e.g., Mistral Small: 8B active / 22B total)
- **KNOWN_PARAMS**: Curated lookup table in params.ts for models where names don't reveal param counts

## Conventions

- ESM project (`"type": "module"` in package.json), strict TypeScript
- Functions return null instead of throwing when inference fails
- Verbose logging goes to stderr; stdout is reserved for JSON output
- Parameter units: billions (B); RAM: GB; context: tokens
- Tests use vitest; test files at `scraper/__tests__/*.test.ts`
