import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Show wordmark next to the mark. */
  withWordmark?: boolean;
  /** Pixel size of the mark square. */
  size?: number;
  /** Unused — kept for call-site compatibility. */
  priority?: boolean;
};

/** Official APIDiffGuard mark — side-by-side diff panes on accent tile. */
export function BrandLogo({
  className,
  withWordmark = false,
  size = 24,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0"
        aria-hidden
      />
      {withWordmark ? (
        <span className="font-semibold tracking-tight">APIDiffGuard</span>
      ) : (
        <span className="sr-only">APIDiffGuard</span>
      )}
    </span>
  );
}
