import type { ModelsData } from "@/lib/types";

export function StatsBar({ data }: { data: ModelsData }) {
  const { models, metadata } = data;

  const tierCounts = {
    edge: models.filter((m) => m.tier === "edge").length,
    basic: models.filter((m) => m.tier === "basic").length,
    capable: models.filter((m) => m.tier === "capable").length,
    strong: models.filter((m) => m.tier === "strong").length,
  };

  const toolCallingCount = models.filter((m) => m.tool_calling).length;
  const officeGradeCount = models.filter((m) => m.office_grade).length;

  const scrapedDate = new Date(metadata.scraped_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Models Tracked" value={metadata.filtered_count} />
      <StatCard label="Edge (<1B)" value={tierCounts.edge} />
      <StatCard label="Basic (1-3B)" value={tierCounts.basic} />
      <StatCard label="Capable (3-7B)" value={tierCounts.capable} />
      <StatCard label="Strong (7-15B)" value={tierCounts.strong} />
      <StatCard label="Tool Calling" value={toolCallingCount} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}
