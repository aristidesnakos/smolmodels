import { loadModelsData } from "@/lib/models";
import { StatsBar } from "@/components/StatsBar";
import { ModelTable } from "@/components/ModelTable";

export default function Home() {
  const data = loadModelsData();
  const scrapedDate = new Date(data.metadata.scraped_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">smolmodels</h1>
        <p className="mt-1 text-[var(--color-text-muted)]">
          Tracking which small language models (&le;15B parameters) are actually
          ready for real work.
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Last updated: {scrapedDate} &middot; {data.metadata.filtered_count}{" "}
          models from {data.metadata.total_models} on OpenRouter
        </p>
      </header>

      <section className="mb-8">
        <StatsBar data={data} />
      </section>

      <section>
        <ModelTable models={data.models} />
      </section>

      <footer className="mt-12 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-muted)]">
        <p>
          Data sourced from{" "}
          <a
            href="https://openrouter.ai"
            className="underline hover:text-[var(--color-text)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenRouter
          </a>
          . Scraped daily via GitHub Actions.
        </p>
        <p className="mt-1">
          <strong>Office-grade</strong> = tool calling + IFEval &ge; 65 +
          quantized RAM &le; 16 GB.
        </p>
        <p className="mt-1">
          <a
            href="https://github.com/aristidesnakos/smolmodels"
            className="underline hover:text-[var(--color-text)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          &middot; MIT License
        </p>
      </footer>
    </>
  );
}
