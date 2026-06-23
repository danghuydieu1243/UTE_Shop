/** charts.test.tsx — smoke tests for hand-rolled SVG chart components (Task 3, Phase 6b). */
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LineAreaChart } from '../components/LineAreaChart';
import { BarChart } from '../components/BarChart';
import type { SeriesPoint, NewUsersPoint } from '../types';

const SERIES: SeriesPoint[] = [
  { date: '2026-06-01', value: 200_000 },
  { date: '2026-06-15', value: 800_000 },
  { date: '2026-06-30', value: 1_200_000 },
];

const USERS: NewUsersPoint[] = [
  { date: '2026-06-01', count: 5 },
  { date: '2026-06-02', count: 8 },
  { date: '2026-06-03', count: 3 },
  { date: '2026-06-04', count: 12 },
  { date: '2026-06-05', count: 7 },
  { date: '2026-06-06', count: 2 },
  { date: '2026-06-07', count: 9 },
];

describe('LineAreaChart', () => {
  it('renders a <path> when data is provided', () => {
    const { container } = render(<LineAreaChart data={SERIES} />);
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('renders "Chưa có dữ liệu" when data is empty', () => {
    const { container } = render(<LineAreaChart data={[]} />);
    expect(container.textContent).toContain('Chưa có dữ liệu');
  });

  it('renders "Chưa có dữ liệu" when all values are zero', () => {
    const zeroData: SeriesPoint[] = [
      { date: '2026-06-01', value: 0 },
      { date: '2026-06-02', value: 0 },
    ];
    const { container } = render(<LineAreaChart data={zeroData} />);
    expect(container.textContent).toContain('Chưa có dữ liệu');
  });

  it('renders an SVG element', () => {
    const { container } = render(<LineAreaChart data={SERIES} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('BarChart', () => {
  it('renders at least 7 <rect> elements when 7 data points provided', () => {
    const { container } = render(<BarChart data={USERS} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(7);
  });

  it('renders an SVG element', () => {
    const { container } = render(<BarChart data={USERS} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders zero bars (no rect) when data is empty', () => {
    const { container } = render(<BarChart data={[]} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(0);
  });
});
