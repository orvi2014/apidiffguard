/**
 * The Diff-eyed Watchdog — APIDiffGuard's mark.
 *
 * The dog is the Guard; its eyes are the − and + markers from a diff gutter.
 * One set of shapes feeds every surface (logo files, favicon, Apple icon,
 * social card), so the mark can't drift between them. The SVG files in
 * public/brand are generated from the same paths.
 */

export const BRAND_BLUE = "#4F7FFF";
/** Feature colour: the page background, so eyes and nose read as cut-outs. */
export const BRAND_INK = "#0A0A0C";

const EARS_AND_HEAD = [
  `<path transform="rotate(16 62 70)" d="M53 52A25 25 0 0 1 78 77V145A25 25 0 0 1 53 170A25 25 0 0 1 28 145V77A25 25 0 0 1 53 52Z"/>`,
  `<path transform="rotate(-16 194 70)" d="M203 52A25 25 0 0 1 228 77V145A25 25 0 0 1 203 170A25 25 0 0 1 178 145V77A25 25 0 0 1 203 52Z"/>`,
  `<path d="M122 40H134A56 56 0 0 1 190 96V160A56 56 0 0 1 134 216H122A56 56 0 0 1 66 160V96A56 56 0 0 1 122 40Z"/>`,
].join("");

const FEATURES = [
  // − eye
  `<rect x="86" y="111" width="36" height="13" rx="6.5"/>`,
  // + eye
  `<rect x="134" y="111" width="36" height="13" rx="6.5"/>`,
  `<rect x="145.5" y="99.5" width="13" height="36" rx="6.5"/>`,
  // nose
  `<rect x="106" y="158" width="44" height="30" rx="15"/>`,
].join("");

/** Square viewBox. The tilted ears reach x≈7.7 and x≈248.3, so this keeps
 *  ~4 units of air at the sides; the head spans y 40–216 inside it. */
export const BRAND_VIEWBOX = "4 4 248 248";

export function watchdogSvg({
  fill = BRAND_BLUE,
  ink = BRAND_INK,
  size,
}: { fill?: string; ink?: string; size?: number } = {}): string {
  const dims = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_VIEWBOX}"${dims}><g fill="${fill}">${EARS_AND_HEAD}</g><g fill="${ink}">${FEATURES}</g></svg>`;
}

/** For `next/og` image routes, which render <img> from a data URI. */
export function watchdogDataUri(options?: Parameters<typeof watchdogSvg>[0]): string {
  return `data:image/svg+xml;base64,${Buffer.from(watchdogSvg(options)).toString("base64")}`;
}
