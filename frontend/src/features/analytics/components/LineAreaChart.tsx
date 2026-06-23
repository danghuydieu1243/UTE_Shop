/** LineAreaChart — hand-rolled SVG line+area chart (NO external dep, NO var(--)).
 *  Props: data: SeriesPoint[], height? (default 180), format? (Y-axis label formatter).
 */
import type { SeriesPoint } from '../types';

const W = 600;
const PAD = { top: 16, right: 24, bottom: 32, left: 56 };

function defaultFormat(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

interface Props {
  data: SeriesPoint[];
  height?: number;
  format?: (v: number) => string;
}

export function LineAreaChart({ data, height = 180, format = defaultFormat }: Props) {
  const H = height;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;
  const isEmpty = data.length === 0 || maxVal === 0;

  // Y-axis ticks (4 lines)
  const gridCount = 4;
  const yTicks = Array.from({ length: gridCount + 1 }, (_, i) => i / gridCount);

  // Map data points to SVG coords
  const pts = data.map((d, i) => {
    const x = PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = isEmpty
      ? PAD.top + chartH
      : PAD.top + chartH - (d.value / maxVal) * chartH * 0.92;
    return { x, y, d };
  });

  // Build line path
  const linePath = pts.length > 0
    ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : '';

  // Build area path (close at baseline)
  const baselineY = PAD.top + chartH;
  const areaPath = pts.length > 0
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${baselineY} L${pts[0].x.toFixed(1)},${baselineY} Z`
    : '';

  // X-axis labels: first, middle, last
  const xLabelIdxs = data.length <= 1
    ? [0]
    : data.length === 2
      ? [0, 1]
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  const gradientId = 'lag-fill';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', display: 'block' }}
      aria-label="Line area chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16161A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#16161A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {yTicks.map((t, i) => {
        const gy = PAD.top + (1 - t) * chartH;
        return (
          <line
            key={i}
            x1={PAD.left}
            y1={gy}
            x2={PAD.left + chartW}
            y2={gy}
            stroke="#ECEAE5"
            strokeWidth="1"
          />
        );
      })}

      {/* Y-axis labels */}
      {yTicks.map((t, i) => {
        const gy = PAD.top + (1 - t) * chartH;
        const val = maxVal * t;
        return (
          <text
            key={i}
            x={PAD.left - 8}
            y={gy + 4}
            textAnchor="end"
            fontSize="10"
            fill="#888"
            fontFamily="system-ui, sans-serif"
          >
            {isEmpty && i === 0 ? '0' : format(Math.round(val))}
          </text>
        );
      })}

      {/* Area fill */}
      {!isEmpty && areaPath && (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      )}

      {/* Baseline for empty state */}
      {isEmpty && (
        <line
          x1={PAD.left}
          y1={baselineY}
          x2={PAD.left + chartW}
          y2={baselineY}
          stroke="#ECEAE5"
          strokeWidth="1.5"
        />
      )}

      {/* Line path */}
      {!isEmpty && linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#16161A"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* X-axis labels */}
      {data.length > 0 &&
        xLabelIdxs.map((idx) => {
          if (idx >= pts.length) return null;
          const p = pts[idx];
          const label = data[idx].date.slice(5); // MM-DD
          return (
            <text
              key={idx}
              x={p.x}
              y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#888"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          );
        })}

      {/* Empty state label */}
      {isEmpty && (
        <text
          x={W / 2}
          y={PAD.top + chartH / 2 + 4}
          textAnchor="middle"
          fontSize="13"
          fill="#AAAAAA"
          fontFamily="system-ui, sans-serif"
        >
          Chưa có dữ liệu
        </text>
      )}
    </svg>
  );
}

export default LineAreaChart;
