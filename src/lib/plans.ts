export const PLAN_IDS = ["free", "starter", "pro", "scale", "team"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  period: string;
  description: string;
  features: string[];
  endpointLimit: number | null;
  /** Outbound checks per calendar month. `null` for unlimited. */
  checkQuota: number | null;
  /** Members per workspace. `null` for unlimited. */
  seatLimit: number | null;
  /** USD per month. `null` for contact-only tiers. */
  monthlyPrice: number | null;
  /**
   * USD per year, when the plan can be bought annually. Ten months' price for
   * twelve months of service — the "two months free" discount. `null` means the
   * plan is monthly-only.
   */
  yearlyPrice?: number | null;
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
    features: [
      "3 endpoints",
      "250 checks/month",
      "Manual checks",
      "Baseline history",
      "Slack + Discord + webhooks",
      "OpenAPI import",
    ],
    endpointLimit: 3,
    checkQuota: 250,
    seatLimit: 1,
    monthlyPrice: 0,
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$29",
    period: "/month",
    description: "Hourly monitoring for a small set of endpoints you own.",
    features: [
      "25 endpoints",
      "20,000 checks/month — hourly on every endpoint",
      "Scheduled checks",
      "Slack + Discord + webhooks",
      "Alert history",
      "OpenAPI import",
    ],
    endpointLimit: 25,
    checkQuota: 20_000,
    seatLimit: 3,
    monthlyPrice: 29,
    yearlyPrice: 290,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$99",
    period: "/month",
    description:
      "For teams watching their own API plus the third-party endpoints they depend on.",
    features: [
      "100 endpoints",
      "80,000 checks/month — hourly on every endpoint",
      "Scheduled checks",
      "Severity-classified diffs",
      "Slack + Discord + webhooks",
      "OpenAPI import",
    ],
    endpointLimit: 100,
    checkQuota: 80_000,
    seatLimit: 10,
    monthlyPrice: 99,
    yearlyPrice: 990,
  },
  {
    id: "scale",
    name: "Scale",
    priceLabel: "$299",
    period: "/month",
    description:
      "For integration platforms: every third-party API you depend on but do not control, checked hourly.",
    features: [
      "300 endpoints",
      "250,000 checks/month — hourly on every endpoint",
      "Scheduled checks",
      "Severity-classified diffs",
      "Ignore rules for noisy upstream paths",
      "Slack + Discord + webhooks + API",
    ],
    endpointLimit: 300,
    checkQuota: 250_000,
    seatLimit: 25,
    monthlyPrice: 299,
    yearlyPrice: 2_990,
    highlighted: true,
  },
  {
    id: "team",
    name: "Enterprise",
    priceLabel: "Custom",
    period: "",
    description:
      "Past 300 endpoints, or self-hosted. Custom limits and priority support, arranged directly with us.",
    features: [
      "Unlimited endpoints",
      "Custom check volume",
      "Priority support",
      "Dedicated onboarding",
    ],
    endpointLimit: null,
    checkQuota: null,
    seatLimit: null,
    monthlyPrice: null,
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

export function planCheckQuota(id: PlanId): number | null {
  return getPlan(id).checkQuota;
}

export function planSeatLimit(id: PlanId): number | null {
  return getPlan(id).seatLimit;
}

export function planMonthlyPrice(id: PlanId): number | null {
  return getPlan(id).monthlyPrice;
}

/** Scheduled checks require Starter or above. */
export function planAllowsSchedules(id: PlanId): boolean {
  return id !== "free";
}

export function canEditWorkspace(role: string): boolean {
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN" || r === "MEMBER";
}

/** Workspace rename / billing-sensitive settings. */
export function canManageWorkspace(role: string): boolean {
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

export type PaidPlanId = Exclude<PlanId, "free" | "team">;

export function isPaidPlan(value: string): value is PaidPlanId {
  return value === "starter" || value === "pro" || value === "scale";
}
