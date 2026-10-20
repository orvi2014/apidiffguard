import type { ReactNode } from "react";

/*
 * Isometric line drawings for the three-part "how it works" row. Strokes draw
 * in as the row scrolls into view where scroll timelines are supported
 * (`.figure-draw` in globals.css); elsewhere they are simply drawn.
 */

const FAINT = "rgba(250,250,250,.18)";
const MID = "rgba(250,250,250,.55)";
const ACCENT = "#6f96ff";

type Line = [number, number, number, number];

/** One isometric slab: top face, front edges and its centre drop. */
function Slab({ cx, top, w, h, depth, stroke }: { cx: number; top: number; w: number; h: number; depth: number; stroke: string }) {
  const mid = top + h;
  const bottom = top + 2 * h;
  return (
    <>
      <polyline
        className="figure-draw"
        points={`${cx - w},${mid} ${cx - w},${mid + depth} ${cx},${bottom + depth} ${cx + w},${mid + depth} ${cx + w},${mid}`}
        fill="none"
        stroke={stroke}
      />
      <line className="figure-draw" x1={cx} y1={bottom} x2={cx} y2={bottom + depth} stroke={stroke} />
      <polygon
        className="figure-draw"
        points={`${cx},${top} ${cx + w},${mid} ${cx},${bottom} ${cx - w},${mid}`}
        fill="none"
        stroke={stroke}
      />
    </>
  );
}

function Lines({ lines, stroke, width = 1 }: { lines: Line[]; stroke: string; width?: number }) {
  return (
    <>
      {lines.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1}-${y1}`}
          className="figure-draw"
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label={label} className="mx-auto block w-full max-w-[320px]" strokeWidth={1}>
      {children}
    </svg>
  );
}

export function BaselinesFigure() {
  return (
    <Figure label="Stacked, versioned baselines">
      {[100, 78, 56].map((top) => (
        <Slab key={top} cx={160} top={top} w={100} h={50} depth={10} stroke={FAINT} />
      ))}
      <Slab cx={160} top={34} w={100} h={50} depth={10} stroke={MID} />
      <Lines
        stroke={MID}
        lines={[
          [96, 82, 158, 113],
          [116, 72, 160, 94],
          [136, 62, 192, 90],
          [156, 52, 192, 70],
        ]}
      />
    </Figure>
  );
}

export function DiffFigure() {
  return (
    <Figure label="A baseline and a live response, offset, with the changed row highlighted">
      <Slab cx={118} top={89} w={78} h={39} depth={10} stroke={MID} />
      <Lines
        stroke={MID}
        lines={[
          [68.1, 126.4, 116.4, 150.6],
          [83.7, 118.6, 118, 135.8],
          [99.3, 110.8, 143, 132.7],
          [114.9, 103, 143, 117.1],
        ]}
      />
      <Slab cx={206} top={65} w={78} h={39} depth={10} stroke={ACCENT} />
      <Lines
        stroke={FAINT}
        lines={[
          [156.1, 102.4, 204.4, 126.6],
          [187.3, 86.8, 231, 108.7],
          [202.9, 79, 231, 93.1],
        ]}
      />
      <Lines stroke={ACCENT} width={2} lines={[[171.7, 94.6, 206, 111.8]]} />
      <text x="40" y="214" fill={MID} fontFamily="var(--font-mono), monospace" fontSize="20">
        −
      </text>
      <text x="268" y="44" fill={ACCENT} fontFamily="var(--font-mono), monospace" fontSize="20">
        +
      </text>
    </Figure>
  );
}

export function AlertFigure() {
  return (
    <Figure label="A check emitting an alert signal">
      <Slab cx={160} top={102} w={96} h={48} depth={12} stroke={MID} />
      <Lines
        stroke={MID}
        lines={[
          [103.4, 145.7, 162.9, 175.4],
          [127.4, 133.7, 169.6, 154.8],
          [151.4, 121.7, 205.1, 148.6],
        ]}
      />
      <line className="figure-draw" x1="160" y1="102" x2="160" y2="70" stroke={ACCENT} />
      <circle cx="160" cy="66" r="4" fill={ACCENT} />
      <path className="figure-draw" d="M130 81 A30 15 0 0 1 190 81" fill="none" stroke={ACCENT} />
      <path className="figure-draw" d="M108 70 A52 26 0 0 1 212 70" fill="none" stroke={FAINT} />
      <path className="figure-draw" d="M86 59 A74 37 0 0 1 234 59" fill="none" stroke={FAINT} />
    </Figure>
  );
}
