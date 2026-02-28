"use client";

import { useState, useMemo } from "react";
import type { ModelEntry, Tier } from "@/lib/types";
import { TierBadge } from "./TierBadge";
import { OfficeBadge } from "./OfficeBadge";
import { FilterBar, type Filters } from "./FilterBar";

type SortKey =
  | "name"
  | "provider"
  | "active_params_b"
  | "tier"
  | "context_length"
  | "quantized_ram_gb"
  | "tool_calling"
  | "office_grade";

type SortDir = "asc" | "desc";

const tierOrder: Record<Tier, number> = {
  edge: 0,
  basic: 1,
  capable: 2,
  strong: 3,
  frontier: 4,
};

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

function formatPricing(pricePerToken: number): string {
  // Convert per-token to per-million-tokens
  const perMillion = pricePerToken * 1_000_000;
  if (perMillion < 0.01) return "Free";
  if (perMillion < 1) return `$${perMillion.toFixed(2)}`;
  return `$${perMillion.toFixed(2)}`;
}

export function ModelTable({ models }: { models: ModelEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("active_params_b");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    tiers: new Set<Tier>(["edge", "basic", "capable", "strong"]),
    toolCallingOnly: false,
    officeGradeOnly: false,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "provider" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (!filters.tiers.has(m.tier)) return false;
      if (filters.toolCallingOnly && !m.tool_calling) return false;
      if (filters.officeGradeOnly && !m.office_grade) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.id.toLowerCase().includes(q) &&
          !m.provider.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [models, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "provider":
          cmp = a.provider.localeCompare(b.provider);
          break;
        case "active_params_b":
          cmp = a.active_params_b - b.active_params_b;
          break;
        case "tier":
          cmp = tierOrder[a.tier] - tierOrder[b.tier];
          break;
        case "context_length":
          cmp = a.context_length - b.context_length;
          break;
        case "quantized_ram_gb":
          cmp = a.quantized_ram_gb - b.quantized_ram_gb;
          break;
        case "tool_calling":
          cmp = (a.tool_calling ? 1 : 0) - (b.tool_calling ? 1 : 0);
          break;
        case "office_grade":
          cmp = (a.office_grade ? 1 : 0) - (b.office_grade ? 1 : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const SortHeader = ({
    label,
    sortKeyName,
    className,
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer select-none px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${className ?? ""}`}
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      {sortKey === sortKeyName && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div>
      <div className="mb-4">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="text-xs text-[var(--color-text-muted)] mb-2">
        Showing {sorted.length} of {models.length} models
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <tr>
              <SortHeader label="Name" sortKeyName="name" />
              <SortHeader label="Provider" sortKeyName="provider" />
              <SortHeader label="Params" sortKeyName="active_params_b" />
              <SortHeader label="Tier" sortKeyName="tier" />
              <SortHeader label="Context" sortKeyName="context_length" />
              <SortHeader label="RAM (Q4)" sortKeyName="quantized_ram_gb" />
              <SortHeader label="Tools" sortKeyName="tool_calling" />
              <SortHeader label="Office" sortKeyName="office_grade" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((model) => (
              <>
                <tr
                  key={model.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                  onClick={() =>
                    setExpandedId(
                      expandedId === model.id ? null : model.id
                    )
                  }
                >
                  <td className="px-3 py-2 font-medium">{model.name}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">
                    {model.provider}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {model.active_params_b}B
                    {model.total_params_b !== model.active_params_b && (
                      <span className="text-[var(--color-text-muted)] text-xs">
                        {" "}
                        / {model.total_params_b}B
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <TierBadge tier={model.tier} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatContext(model.context_length)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {model.quantized_ram_gb} GB
                  </td>
                  <td className="px-3 py-2">
                    {model.tool_calling ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <OfficeBadge officeGrade={model.office_grade} />
                  </td>
                </tr>
                {expandedId === model.id && (
                  <tr
                    key={`${model.id}-detail`}
                    className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    <td colSpan={8} className="px-4 py-3">
                      <ModelDetail model={model} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((model) => (
          <div
            key={model.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{model.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {model.provider}
                </div>
              </div>
              <TierBadge tier={model.tier} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)]">Params:</span>{" "}
                {model.active_params_b}B
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">RAM:</span>{" "}
                {model.quantized_ram_gb} GB
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Context:</span>{" "}
                {formatContext(model.context_length)}
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Tools:</span>{" "}
                {model.tool_calling ? "Yes" : "No"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelDetail({ model }: { model: ModelEntry }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-4">
      <div>
        <span className="text-[var(--color-text-muted)]">Model ID</span>
        <div className="font-mono">{model.id}</div>
      </div>
      <div>
        <span className="text-[var(--color-text-muted)]">Active / Total Params</span>
        <div>
          {model.active_params_b}B / {model.total_params_b}B
        </div>
      </div>
      <div>
        <span className="text-[var(--color-text-muted)]">Context Length</span>
        <div>{model.context_length.toLocaleString()} tokens</div>
      </div>
      <div>
        <span className="text-[var(--color-text-muted)]">RAM (Q4_K_M)</span>
        <div>{model.quantized_ram_gb} GB</div>
      </div>
      <div>
        <span className="text-[var(--color-text-muted)]">Pricing (per 1M tokens)</span>
        <div>
          In: {formatPricing(model.pricing.prompt)} / Out:{" "}
          {formatPricing(model.pricing.completion)}
        </div>
      </div>
      <div>
        <span className="text-[var(--color-text-muted)]">Reasoning</span>
        <div>{model.reasoning ? "Yes" : "No"}</div>
      </div>
      <div>
        <span className="text-[var(--color-text-muted)]">Multimodal</span>
        <div>{model.multimodal ? "Yes" : "No"}</div>
      </div>
      {model.license && (
        <div>
          <span className="text-[var(--color-text-muted)]">License</span>
          <div>{model.license}</div>
        </div>
      )}
    </div>
  );
}
