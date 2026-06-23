/** BarChart — hand-rolled SVG bar chart for newUsersSeries (NO external dep, NO var(--)).
 *  Props: data: NewUsersPoint[], height? (default 180).
 */
import type { NewUsersPoint } from '../types';

const W = 600;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
const BAR_GAP = 0.25; // fraction of bar slot used as gap

interface Props {
  data: NewUsersPoint[];
  height?: number;
}

export function BarChart({ data, height = 180 }: Props) {
  const H = height;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const baselineY = PAD.top + chartH;

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count), 1) : 1;
  const n = data.length;

  const slotW = n > 0 ? chartW / n : chartW;
  const barW = slotW * (1 - BAR_GAP);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', display: 'block' }}
      aria-label="Bar chart"
    >
      {/* Baseline */}
      <line
        x1={PAD.left}
        y1={baselineY}
        x2={PAD.left + chartW}
        y2={baselineY}
        stroke="#ECEAE5"
        strokeWidth="1"
      />

      {data.map((d, i) => {
        const barH = Math.max((d.count / maxCount) * chartH * 0.92, d.count > 0 ? 2 : 0);
        const x = PAD.left + i * slotW + (slotW - barW) / 2;
        const y = baselineY - barH;

        // Format date as dd/MM
        const parts = d.date.split('-');
        const label = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : d.date.slice(5);

        return (
          <g key={i}>
            <rect
              x={x.toFixed(1)}
              y={y.toFixed(1)}
              width={barW.toFixed(1)}
              height={Math.max(barH, 0).toFixed(1)}
              fill="#16161A"
              rx="2"
            />
            <text
              x={(x + barW / 2).toFixed(1)}
              y={H - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#888"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Empty state */}
      {data.length === 0 && (
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

export default BarChart;
