import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Shared bearer check for cron routes.
 *
 * Constant-time so the secret can't be recovered a byte at a time by timing
 * repeated requests, and fails closed when `CRON_SECRET` is unset.
 */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  return safeEqual(auth, `Bearer ${secret}`);
}
