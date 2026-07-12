export const PLAN_IDS = ["free", "starter", "pro", "team"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  period: string;
  description: string;
  features: string[];
  endpointLimit: number | null;
  highlighted?: boolean;
  contactOnly?: boolean;
};

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    period: "forever",
    description: "For trying the diff engine on a handful of endpoints.",
    features: ["3 endpoints", "Manual checks", "Baseline history", "Email alerts"],
    endpointLimit: 3,
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$19",
    period: "/month",
    description: "Scheduled monitoring for small teams and side projects.",
    features: [
      "20 endpoints",
      "Scheduled checks",
      "Slack + email",
      "Ignore rules",
      "7-day alert history",
    ],
    endpointLimit: 20,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$49",
    period: "/month",
    description: "The plan most teams stay on once CI is wired up.",
    features: [
      "100 endpoints",
      "Unlimited baselines",
      "OpenAPI import",
      "CLI access",
      "Priority alerts",
      "Webhook channel",
    ],
    endpointLimit: 100,
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    priceLabel: "Custom",
    period: "",
    description: "Multi-workspace orgs with audit and role controls.",
    features: [
      "Unlimited endpoints",
      "Multiple workspaces",
      "RBAC",
      "Audit logs",
      "SSO (soon)",
      "Dedicated support",
    ],
    endpointLimit: null,
    contactOnly: true,
  },
];

export function isPlanId(value: string | null | undefined): value is PlanId {
  return !!value && (PLAN_IDS as readonly string[]).includes(value);
}

export function normalizePlan(value: string | null | undefined): PlanId {
  return isPlanId(value) ? value : "free";
}

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planEndpointLimit(id: PlanId): number | null {
  return getPlan(id).endpointLimit;
}

export type PaidPlanId = Exclude<PlanId, "free" | "team">;

export function isPaidPlan(value: string): value is PaidPlanId {
  return value === "starter" || value === "pro";
}
