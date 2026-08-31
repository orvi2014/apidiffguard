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
    priceLabel: "$19",
    period: "/month",
    description: "Scheduled monitoring for small teams and side projects.",
    features: [
      "20 endpoints",
      "Scheduled checks",
      "Slack + Discord + webhooks",
      "Alert history",
      "OpenAPI import",
    ],
    endpointLimit: 20,
    checkQuota: 5000,
    seatLimit: 3,
    monthlyPrice: 19,
    yearlyPrice: 190,
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$49",
    period: "/month",
    description: "More endpoints and schedules for growing monitoring needs.",
    features: [
      "100 endpoints",
      "Scheduled checks",
      "Slack + Discord + webhooks",
      "Alert history",
      "OpenAPI import",
    ],
    endpointLimit: 100,
    checkQuota: 25000,
    seatLimit: 10,
    monthlyPrice: 49,
    yearlyPrice: 490,
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    priceLabel: "Custom",
    period: "",
    description:
      "Custom limits and priority support, arranged directly with us. Not a self-serve tier.",
    features: [
      "Custom endpoint limits",
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
  return value === "starter" || value === "pro";
}
