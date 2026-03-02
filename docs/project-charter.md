# smolmodels — Project Charter & PRD

_Last updated: 2026-03-02_

---

## Project Charter

### Problem Statement

Most AI benchmark leaderboards focus on frontier models (GPT-4, Claude, Gemini). Small models (≤15B parameters) that can run locally on commodity hardware are systematically undercounted — their real-world usage is invisible to API telemetry, and no single resource tracks which of them are actually production-ready for everyday office work.

### Goal

Build and maintain a public tracker that answers one question:
**Which small language models can you run locally today and actually get real work done?**

### Success Criteria

- Dashboard is live and publicly accessible
- Data updates automatically every day without manual intervention
- Any engineer can add a model or fix a parameter count in under 5 minutes
- Site loads fast and works on mobile

### Scope

**In scope:**
- Models available on OpenRouter's public API
- Models with ≤15B active parameters (locally runnable on 16 GB RAM)
- MoE (Mixture of Experts) models where the active parameter count fits the threshold

**Out of scope:**
- Proprietary API-only models (GPT-4o, Claude, Gemini) — no param count available
- Models with no published parameter count that can't be inferred
- Running actual local benchmarks (Phase 1 deferred; roadmap item)

---

## Product Requirements Document (PRD)

### Core Data Schema

Each model entry in `data/models.json`:

| Field | Type | Source | Notes |
|-------|------|---------|-------|
| `id` | string | OpenRouter | Slug, e.g. `qwen/qwen3-8b` |
| `name` | string | OpenRouter | Display name |
| `provider` | string | Derived | Org portion of slug |
| `active_params_b` | number | Inferred / HF | Billions of active params |
| `total_params_b` | number | Inferred / HF | Same as active for dense; larger for MoE |
| `tier` | enum | Computed | edge / basic / capable / strong / frontier |
| `tool_calling` | boolean | OpenRouter | `"tools"` in `supported_parameters` |
| `tool_score` | number\|null | Manual (future) | Currently always null |
| `ifeval_score` | number\|null | Manual (future) | Currently always null |
| `context_length` | number | OpenRouter | Tokens |
| `quantized_ram_gb` | number | Computed | Q4_K_M estimate: `params × 0.6 + 0.5` |
| `reasoning` | boolean | Heuristic | Name/description contains reasoning signals |
| `multimodal` | boolean | OpenRouter | `image` in `input_modalities` |
| `license` | string | HF (optional) | Empty if `--enrich` not used |
| `pricing` | object | OpenRouter | Per-token USD, input + output |
| `office_grade` | boolean | Computed | See formula below |

### Tier Classification

| Tier | Active Params |
|------|--------------|
| edge | < 1B |
| basic | 1–3B |
| capable | 3–7B |
| strong | 7–15B |
| frontier | > 15B (tracked but out of scope) |

### Office-Grade Formula

```
office_grade = tool_calling
            AND ifeval_score >= 65
            AND quantized_ram_gb <= 16
```

**Current status:** `ifeval_score` is always `null` (not available from any public API). All models are conservatively `office_grade: false` until scores are added manually via a future `data/overrides.json`.

### Param Inference Logic

Priority order:
1. `KNOWN_PARAMS` lookup table (manually curated for models with no count in slug)
2. Regex extraction from model slug — last `Xb` pattern wins (avoids version number confusion)
3. MoE patterns — `8x7b` → active = `2 × 7 = 14B`, total = `8 × 7 = 56B`
4. `null` → model excluded from output, logged as unmatched

---

## Architecture Decisions

### Decision: TypeScript everywhere (not Python)

**Alternatives considered:** Python scraper (as in the original README spec)
**Choice:** TypeScript for both scraper and site
**Rationale:** One language, one toolchain, one lockfile setup. No context-switching. Any contributor can work on any part of the repo.

### Decision: JSON import vs. readFileSync

**Alternatives considered:** `readFileSync` with `process.cwd()` relative path
**Choice:** Static `import rawData from "../../data/models.json"`
**Rationale:** Works in all environments — Vercel, local dev, CI. No runtime file I/O. Data is bundled at build time, making the page fully static with zero server dependencies.

### Decision: Next.js App Router (not Astro)

**Alternatives considered:** Astro (original README spec)
**Choice:** Next.js 15 App Router
**Rationale:** Vercel-native. Server components for zero-JS stats bar. Client islands for interactive table. Same framework if we ever add API routes or server actions.

### Decision: GitHub Actions for cron (not Vercel Cron)

**Alternatives considered:** Vercel Cron → API route → Vercel KV storage
**Choice:** GitHub Actions daily cron → commits `data/models.json` → triggers Vercel rebuild
**Rationale:** Git history IS the data changelog — every daily scrape is a traceable commit. No additional storage service needed. Simpler, free, transparent.

### Decision: office_grade deferred (no overrides.json yet)

**Alternatives considered:** Build `data/overrides.json` for manually curated benchmark scores
**Choice:** Deferred — `office_grade` is always `false` until implemented
**Rationale:** Ship the tracker first. The benchmark data pipeline is a separate problem. Conservative is better than wrong.

### Decision: HuggingFace enrichment built (--enrich flag)

**Alternatives considered:** Defer HF integration
**Choice:** Built in Phase 1 as an opt-in `--enrich` flag
**Rationale:** Provides verified param counts and license info when run. Gracefully degrades — scraper works without it. Rate-limit aware (500ms between requests, skips on 429).

---

## Roadmap

### Done (MVP)
- [x] TypeScript scraper with regex + KNOWN_PARAMS param inference
- [x] HuggingFace enrichment module (`--enrich` flag)
- [x] Next.js 15 dashboard — sortable/filterable model table
- [x] Tier badges, stats bar, expandable row details
- [x] GitHub Actions: daily scrape cron + CI checks on PRs
- [x] Vercel deployment config
- [x] 55 unit tests (param inference + tier classification)
- [x] Initial dataset: 83 models ≤15B from OpenRouter

### Near-term (Phase 2)
- [ ] `data/overrides.json` — manually curated IFEval/tool scores → `office_grade` becomes meaningful
- [ ] URL query param sync — shareable filtered views
- [ ] CSV download from filtered view
- [ ] "What is office-grade?" explainer section on site

### Later (Phase 3)
- [ ] Ollama integration testing — does model X actually run tools end-to-end?
- [ ] Real tool-use eval harness — replace estimated scores with reproducible benchmarks
- [ ] KNOWN_PARAMS contributor guide — make it easy to add missing models

---

## How to Run

```bash
# Install deps
pnpm install          # root (scraper + tests)
cd site && pnpm install  # site

# Scraper
npx tsx scraper/scrape.ts --verbose            # basic run
npx tsx scraper/scrape.ts --verbose --enrich   # with HF enrichment (slow)

# Tests
npx vitest run

# Site dev
cd site && pnpm run dev    # http://localhost:3000

# Site build
cd site && pnpm run build
```

---

## Repo Structure

```
smolmodels/
├── scraper/
│   ├── scrape.ts              # CLI entry: fetch → enrich → process → write
│   ├── lib/
│   │   ├── openrouter.ts      # API client with retry/backoff
│   │   ├── huggingface.ts     # HF enrichment (--enrich flag)
│   │   ├── params.ts          # Regex + KNOWN_PARAMS inference
│   │   ├── tiers.ts           # Tier, RAM, office_grade logic
│   │   └── types.ts           # Shared TypeScript interfaces
│   └── __tests__/             # 55 Vitest tests
├── site/                      # Next.js 15 App Router
│   ├── app/                   # Routes + layout
│   ├── components/            # ModelTable, FilterBar, StatsBar, badges
│   └── lib/                   # Data loading + types
├── data/
│   └── models.json            # Version-controlled scraper output
├── .github/workflows/
│   ├── scrape.yml             # Daily cron (6 AM UTC)
│   └── deploy-check.yml       # CI on PRs
└── vercel.json                # Vercel deployment config
```
