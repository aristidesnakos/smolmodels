"use client";

import type { Tier } from "@/lib/types";

export interface Filters {
  search: string;
  tiers: Set<Tier>;
  toolCallingOnly: boolean;
  officeGradeOnly: boolean;
}

const ALL_TIERS: Tier[] = ["edge", "basic", "capable", "strong"];

const tierLabels: Record<Tier, string> = {
  edge: "Edge",
  basic: "Basic",
  capable: "Capable",
  strong: "Strong",
  frontier: "Frontier",
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search models..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
      />

      {/* Tier checkboxes */}
      <div className="flex items-center gap-2">
        {ALL_TIERS.map((tier) => (
          <label
            key={tier}
            className="flex cursor-pointer items-center gap-1 text-xs"
          >
            <input
              type="checkbox"
              checked={filters.tiers.has(tier)}
              onChange={() => {
                const next = new Set(filters.tiers);
                if (next.has(tier)) next.delete(tier);
                else next.add(tier);
                onChange({ ...filters, tiers: next });
              }}
              className="rounded border-[var(--color-border)] accent-[var(--color-accent)]"
            />
            <span className="text-[var(--color-text-muted)]">
              {tierLabels[tier]}
            </span>
          </label>
        ))}
      </div>

      {/* Toggle filters */}
      <label className="flex cursor-pointer items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={filters.toolCallingOnly}
          onChange={() =>
            onChange({
              ...filters,
              toolCallingOnly: !filters.toolCallingOnly,
            })
          }
          className="rounded accent-[var(--color-accent)]"
        />
        <span className="text-[var(--color-text-muted)]">Tool Calling</span>
      </label>

      <label className="flex cursor-pointer items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={filters.officeGradeOnly}
          onChange={() =>
            onChange({
              ...filters,
              officeGradeOnly: !filters.officeGradeOnly,
            })
          }
          className="rounded accent-[var(--color-accent)]"
        />
        <span className="text-[var(--color-text-muted)]">Office Grade</span>
      </label>
    </div>
  );
}
