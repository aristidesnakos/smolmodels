import type { Tier } from "@/lib/types";

const tierLabels: Record<Tier, string> = {
  edge: "Edge",
  basic: "Basic",
  capable: "Capable",
  strong: "Strong",
  frontier: "Frontier",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`tier-${tier} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
    >
      {tierLabels[tier]}
    </span>
  );
}
