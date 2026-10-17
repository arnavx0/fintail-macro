import { type Accessor, createMemo, createSignal } from 'solid-js';
import { match } from 'ts-pattern';
import {
  allocation,
  annualisedVolatility,
  concentrationWarnings,
  growthIndex,
  incomeSummary,
  maxDrawdown,
  mergeHoldings,
  moneyWeightedReturn,
  portfolioTotals,
  rangeStartIndex,
  selectPlatforms,
  timeWeightedReturn,
} from '../core/metrics';
import type { Holding, PortfolioSnapshot, RangeId } from '../core/types';

export type AllocationLens = 'Asset class' | 'Sector' | 'Region' | 'Platform';

export const ALLOCATION_LENSES: readonly AllocationLens[] = [
  'Asset class',
  'Sector',
  'Region',
  'Platform',
];

/**
 * The Portfolio section's state: which platforms are in view, the chart
 * range, the allocation lens, and every figure derived from them. Every
 * number on the page reads from here, so a filter changes all of them at once.
 */
export function createPortfolioViewState(
  snapshot: Accessor<PortfolioSnapshot>
) {
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set());
  const [range, setRange] = createSignal<RangeId>('1Y');
  const [lens, setLens] = createSignal<AllocationLens>('Asset class');

  const togglePlatform = (platformId: string) => {
    const next = new Set(selected());
    if (next.has(platformId)) next.delete(platformId);
    else next.add(platformId);
    // Selecting every platform is the same as selecting none: show all.
    setSelected(
      next.size === snapshot().platforms.length ? new Set<string>() : next
    );
  };

  const view = createMemo(() => selectPlatforms(snapshot(), selected()));
  const totals = createMemo(() => portfolioTotals(view().holdings));

  const rangePoints = createMemo(() => {
    const points = view().history;
    return points.slice(rangeStartIndex(points, range()));
  });

  const benchmarkPoints = createMemo(() => {
    const levels = snapshot().benchmark.levels;
    return levels.slice(rangeStartIndex(levels, range()));
  });

  const performance = createMemo(() => {
    const points = rangePoints();
    const first = points[0]?.value ?? 0;
    const last = points.at(-1)?.value ?? 0;
    const deposits = points.slice(1).reduce((sum, p) => sum + p.netFlow, 0);
    return {
      moneyWeighted: moneyWeightedReturn(points),
      timeWeighted: timeWeightedReturn(points),
      benchmark: timeWeightedReturn(benchmarkPoints()),
      gain: last - first - deposits,
      deposits,
    };
  });

  /** Portfolio and benchmark growth of 1, for the comparison chart. */
  const chartSeries = createMemo(() => {
    const points = rangePoints();
    const portfolio = growthIndex(points);
    const benchmark = growthIndex(benchmarkPoints());
    return points.map((point, i) => ({
      date: new Date(`${point.date}T00:00:00Z`),
      value: point.value,
      portfolio: portfolio[i] - 1,
      benchmark: (benchmark[i] ?? benchmark.at(-1) ?? 1) - 1,
    }));
  });

  const risk = createMemo(() => ({
    volatility: annualisedVolatility(rangePoints()),
    maxDrawdown: maxDrawdown(rangePoints()),
    largestWeight: mergeHoldings(view().holdings)[0]?.weight ?? 0,
    warnings: concentrationWarnings(view().holdings),
  }));

  const platformName = (id: string) =>
    snapshot().platforms.find((p) => p.id === id)?.name ?? id;

  const lensKey = (h: Holding): string =>
    match(lens())
      .with('Asset class', () => h.assetClass)
      .with('Sector', () => h.sector)
      .with('Region', () => h.region)
      .with('Platform', () => platformName(h.platformId))
      .exhaustive();

  const slices = createMemo(() => allocation(view().holdings, lensKey));
  const holdings = createMemo(() => mergeHoldings(view().holdings));
  const income = createMemo(() =>
    incomeSummary(view().holdings, view().upcomingDividends)
  );

  return {
    /** Raw holdings, history and dividends for the selected platforms. */
    view,
    rangePoints,
    benchmarkPoints,
    selected,
    togglePlatform,
    clearPlatforms: () => setSelected(new Set<string>()),
    range,
    setRange,
    lens,
    setLens,
    totals,
    performance,
    chartSeries,
    risk,
    slices,
    holdings,
    income,
    platformName,
  };
}

export type PortfolioViewState = ReturnType<typeof createPortfolioViewState>;
