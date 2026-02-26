# smolmodels

> Tracking which small language models (≤15B parameters) are actually ready for real work.

[![Models Tracked](https://img.shields.io/badge/models%20tracked-live-blue)](./data/models.json)
[![Last Updated](https://img.shields.io/badge/last%20updated-daily-brightgreen)](../../actions/workflows/scrape.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

<!-- Dashboard screenshot placeholder -->
<!-- ![Dashboard Screenshot](./site/public/screenshot.png) -->

---

## The Thesis

Most AI benchmark leaderboards are optimized for GPT-4-class models. Nobody is seriously tracking whether a 7B model can do your job. We are.

There's a sufficiency threshold of intelligence for everyday office AI: drafting documents, searching the web, inspecting data, orchestrating a sequence of tool calls. You don't need a frontier model for any of that. Small models are rapidly approaching this threshold, and the interesting question isn't *if* they'll get there — it's *which ones already have*.

We define "office-grade" as: the model can reliably call tools, follow multi-step instructions (IFEval ≥ 65), and run quantized on commodity hardware (≤16 GB RAM). That's it. If a model clears those three bars, a developer can ship a local-first AI product today, on a laptop, without an API bill.

The data gap is real. OpenRouter and a16z's State of AI report shows small model API usage declining. Mozilla AI's response correctly identifies this as a measurement artifact — small models run locally, and local usage is invisible to API telemetry. The actual small model market is massive, underserved, and under-tracked. This project fixes that.

---

## How It Works

```
scraper/ ──→ data/models.json ──→ site/
```

A GitHub Actions cron job runs the scraper daily. The scraper hits OpenRouter's public `/api/v1/models` endpoint, infers parameter counts from model names (e.g. `qwen3-8b`, `llama-3.2-3b`) plus a curated lookup table, filters to ≤15B active parameters, and commits the updated `models.json`. The site reads directly from that file. No database — the JSON file *is* the database, with full git history as a changelog.

### Repo Structure

```
smolmodels/
├── README.md
├── site/                    # Dashboard (React / Astro)
│   ├── README.md
│   └── src/
├── scraper/                 # Data pipeline
│   ├── README.md
│   ├── openrouter_scraper.py
│   └── requirements.txt
├── data/
│   └── models.json          # Scraper output — version-controlled
└── .github/workflows/
    └── scrape.yml           # Daily cron job
```

---

## Quickstart

### Run the scraper locally

```bash
cd scraper
pip install -r requirements.txt

# Basic run — filters to ≤15B params, writes data/models.json
python openrouter_scraper.py

# With options
python openrouter_scraper.py --max-params 8 --csv --enrich
```

**CLI flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--max-params` | `15` | Maximum active parameter count (billions) |
| `--output` | `../data/models.json` | Output path for JSON |
| `--csv` | off | Also write a CSV alongside the JSON |
| `--enrich` | off | Fetch verified param counts from HuggingFace |

### Run the site locally

```bash
cd site
npm install
npm run dev
```

The site reads `../data/models.json` at build/runtime. No API keys required.

---

## Data Schema

`data/models.json` top-level structure:

```jsonc
{
  "metadata": {
    "scraped_at": "2025-01-01T00:00:00Z",
    "version": "1.0",
    "total_models": 142,
    "filtered_count": 98
  },
  "models": [ /* array of model objects */ ]
}
```

Per-model fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | OpenRouter model slug |
| `name` | string | Display name |
| `provider` | string | Model family / org |
| `active_params_b` | number | Active params in billions (per-token for MoE) |
| `total_params_b` | number | Total params (same as active for dense models) |
| `tier` | string | `edge` / `basic` / `capable` / `strong` / `frontier` |
| `tool_calling` | boolean | Supports tool / function calling |
| `tool_score` | number \| null | Estimated tool-use benchmark score |
| `ifeval_score` | number \| null | IFEval instruction-following score |
| `context_length` | number | Max context window (tokens) |
| `quantized_ram_gb` | number | Estimated RAM at Q4_K_M quantization |
| `reasoning` | boolean | Chain-of-thought / reasoning mode |
| `multimodal` | boolean | Accepts image input |
| `license` | string | License identifier |
| `pricing` | object | `{ prompt, completion }` per-token USD from OpenRouter |
| `office_grade` | boolean | `tool_calling && ifeval_score >= 65 && quantized_ram_gb <= 16` |

---

## Tier System

| Tier | Param Range | Label |
|------|-------------|-------|
| `edge` | < 1B | Runs on microcontrollers and phones |
| `basic` | 1–3B | Runs on any modern laptop CPU |
| `capable` | 3–7B | The workhorse tier — GPU optional |
| `strong` | 7–15B | Near-frontier quality on consumer GPUs |
| `frontier` | > 15B | Out of scope (tracked for reference only) |

---

## Contributing

The most impactful contribution is keeping the parameter lookup table accurate.

### Add or fix a model

If a model's parameter count can't be inferred from its name, it goes in the `KNOWN_PARAMS` dict in `scraper/openrouter_scraper.py`:

```python
KNOWN_PARAMS = {
    "mistralai/mistral-small": 22,      # total, ~8B active
    "google/gemma-3-12b": 12,
    # add your entry here
}
```

Submit a PR with the model slug and your source (HuggingFace model card, official announcement, etc.).

### Improve parameter inference

The scraper uses regex patterns to extract param counts from model slugs. If you find a naming convention it misses, improve the patterns in `scraper/openrouter_scraper.py` and add a test case.

### Suggest new metrics

Open an issue describing the metric, how it should be sourced, and why it's useful for the office-grade classification. IFEval and tool score are the current focus; we're open to adding MMLU, GPQA, or coding benchmarks if they're consistently available.

### General guidelines

- Keep PRs small and focused
- Data changes (JSON, lookup table) are always welcome
- For site changes, run `npm run build` before submitting

---

## Roadmap

- [ ] **Live auto-updating site** — deploy to GitHub Pages / Vercel, update on every scraper commit
- [ ] **Ollama integration testing** — can model X actually run tools end-to-end via Ollama? Real pass/fail, not estimated scores
- [ ] **Real tool-use eval harness** — replace estimated tool scores with a reproducible benchmark suite
- [ ] **Weekly changelog auto-generation** — summarize model additions and score changes from git diffs
- [ ] **Embeddable widget** — drop-in table of office-grade models for any site
- [ ] **HuggingFace enrichment by default** — verified param counts without needing the `--enrich` flag

---

## License

MIT — see [LICENSE](./LICENSE).

---

*Built for developers shipping local-first AI. If you're deploying on commodity hardware and care which 7B model will actually follow your instructions, this is for you.*