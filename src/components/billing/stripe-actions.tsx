"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  plan,
  label,
  variant = "default",
  className,
}: {
  plan: "starter" | "pro";
  label: string;
  variant?: "default" | "secondary";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        className="w-full min-h-9"
        variant={variant}
        disabled={loading}
        aria-busy={loading}
        onClick={startCheckout}
      >
        {loading ? "Redirecting…" : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PortalButton({
  label = "Manage payment",
  variant = "ghost",
  disabled = false,
  className,
}: {
  label?: string;
  variant?: "default" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not open billing portal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={disabled || loading}
        aria-busy={loading}
        onClick={openPortal}
      >
        {loading ? "Opening…" : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
