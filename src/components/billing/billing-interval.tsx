"use client";

import { createContext, useContext, useId, useState } from "react";

export type BillingInterval = "month" | "year";

/**
 * Monthly unless a provider says otherwise, so `CheckoutButton` keeps working
 * on surfaces that never offer the choice (Settings → Billing).
 */
const BillingIntervalContext = createContext<{
  interval: BillingInterval;
  setInterval: (next: BillingInterval) => void;
}>({ interval: "month", setInterval: () => {} });

export function useBillingInterval() {
  return useContext(BillingIntervalContext);
}

export function BillingIntervalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [interval, setInterval] = useState<BillingInterval>("month");
  return (
    <BillingIntervalContext.Provider value={{ interval, setInterval }}>
      {children}
    </BillingIntervalContext.Provider>
  );
}

const OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

export function BillingIntervalToggle({ className }: { className?: string }) {
  const { interval, setInterval } = useBillingInterval();
  const groupId = useId();

  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Billing period"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {OPTIONS.map((option) => {
          const active = interval === option.value;
          return (
            <button
              key={option.value}
              id={`${groupId}-${option.value}`}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setInterval(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="ml-3 text-xs text-muted">
        Yearly is two months free.
      </span>
    </div>
  );
}

/**
 * Price for the selected period.
 *
 * Plans with no yearly price (Free, and the contact-only Team tier) keep
 * showing their own label rather than pretending an annual option exists.
 */
export function PlanPrice({
  priceLabel,
  period,
  yearlyPrice,
}: {
  priceLabel: string;
  period: string;
  yearlyPrice?: number | null;
}) {
  const { interval } = useBillingInterval();
  const yearly = interval === "year" && typeof yearlyPrice === "number";

  return (
    <div className="mt-3 flex items-baseline gap-1">
      <span className="text-3xl font-semibold tracking-tight">
        {yearly ? `$${yearlyPrice}` : priceLabel}
      </span>
      <span className="text-sm text-muted">{yearly ? "/year" : period}</span>
    </div>
  );
}
