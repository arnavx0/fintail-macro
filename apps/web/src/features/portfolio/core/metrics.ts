import type {
  Holding,
  PortfolioSnapshot,
  RangeId,
  UpcomingDividend,
  ValuePoint,
} from './types';

/** Trading days per year, used to annualise daily volatility. */
const TRADING_DAYS = 252;
/** A single position above this share of the portfolio is a concentration risk. */
export const POSITION_CONCENTRATION = 0.2;
/** A single sector above this share of the portfolio is a concentration risk. */
export const SECTOR_CONCENTRATION = 0.4;
/** Allocation slices past this many fold into "Other". */
const MAX_SLICES = 6;

/** The holdings, history and dividends for the selected platforms; every platform when none are selected. */
export function selectPlatforms(
  snapshot: PortfolioSnapshot,
  selected: ReadonlySet<string>
) {
  const includes = (platformId: string) =>
    selected.size === 0 || selected.has(platformId);
  return {
    holdings: snapshot.holdings.filter((h) => includes(h.platformId)),
    history: combineHistory(
      Object.entries(snapshot.history)
        .filter(([platformId]) => includes(platformId))
        .map(([, points]) => points)
    ),
    upcomingDividends: snapshot.upcomingDividends.filter((d) =>
      includes(d.platformId)
    ),
  };
}

/** Sum several platforms' day-end values and flows, date by date. */
export function combineHistory(
  series: readonly (readonly ValuePoint[])[]
): ValuePoint[] {
  const [first, ...rest] = series;
  if (!first) return [];
  return first.map((point, index) => ({
    date: point.date,
    value: rest.reduce((sum, s) => sum + (s[index]?.value ?? 0), point.value),
    netFlow: rest.reduce(
      (sum, s) => sum + (s[index]?.netFlow ?? 0),
      point.netFlow
    ),
  }));
}

export const positionValue = (h: Holding) => h.quantity * h.price;

/** Headline totals: what it is worth, how today went, and the gain on cost. */
export function portfolioTotals(holdings: readonly Holding[]) {
  const value = holdings.reduce((sum, h) => sum + positionValue(h), 0);
  const dayChange = holdings.reduce(
    (sum, h) => sum + h.quantity * (h.price - h.previousClose),
    0
  );
  const cost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const openValue = value - dayChange;
  return {
    value,
    dayChange,
    dayChangePct: openValue === 0 ? 0 : dayChange / openValue,
    cost,
    unrealized: value - cost,
    unrealizedPct: cost === 0 ? 0 : (value - cost) / cost,
  };
}

/** Index of the first point inside `range`, counting back from the last point. */
export function rangeStartIndex(
  points: readonly ValuePoint[],
  range: RangeId
): number {
  const last = points.at(-1);
  if (!last || range === 'ALL') return 0;
  const end = new Date(`${last.date}T00:00:00Z`);
  const start = new Date(end);
  if (range === 'YTD') {
    start.setUTCMonth(0, 1);
  } else {
    const days = { '1W': 7, '1M': 30, '3M': 91, '1Y': 365 }[range];
    start.setUTCDate(start.getUTCDate() - days);
  }
  const startDate = start.toISOString().slice(0, 10);
  const index = points.findIndex((p) => p.date >= startDate);
  return index === -1 ? 0 : index;
}

/**
 * Money-weighted return (Modified Dietz) over `points`: the gain as a share of
 * the money that was actually at work, so deposits and withdrawals count for
 * the time they were invested. This is the return an investor experienced.
 */
export function moneyWeightedReturn(points: readonly ValuePoint[]): number {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return 0;
  const span = points.length - 1;
  let flows = 0;
  let weightedFlows = 0;
  points.slice(1).forEach((point, index) => {
    flows += point.netFlow;
    weightedFlows += point.netFlow * ((span - (index + 1)) / span);
  });
  const invested = first.value + weightedFlows;
  return invested === 0 ? 0 : (last.value - first.value - flows) / invested;
}

/** Daily returns with each day's flow removed, so deposits are not counted as gains. */
export function dailyReturns(points: readonly ValuePoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1].value;
    if (previous === 0) continue;
    returns.push((points[i].value - points[i].netFlow) / previous - 1);
  }
  return returns;
}

/** Growth of 1 unit invested at the first point, flow-neutral (time-weighted). */
export function growthIndex(points: readonly ValuePoint[]): number[] {
  const index = [1];
  for (const r of dailyReturns(points)) index.push(index.at(-1)! * (1 + r));
  return index;
}

/** Time-weighted return: the portfolio's performance independent of when money moved. */
export function timeWeightedReturn(points: readonly ValuePoint[]): number {
  return (growthIndex(points).at(-1) ?? 1) - 1;
}

/** Annualised standard deviation of daily time-weighted returns. */
export function annualisedVolatility(points: readonly ValuePoint[]): number {
  const returns = dailyReturns(points);
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
}

/** Largest peak-to-trough fall of the time-weighted index, as a negative share. */
export function maxDrawdown(points: readonly ValuePoint[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const level of growthIndex(points)) {
    peak = Math.max(peak, level);
    worst = Math.min(worst, level / peak - 1);
  }
  return worst;
}

export type Slice = { label: string; value: number; weight: number };

/** Allocation by a holding attribute, largest first, small slices folded into "Other". */
export function allocation(
  holdings: readonly Holding[],
  key: (h: Holding) => string
): Slice[] {
  const totals = new Map<string, number>();
  for (const h of holdings) {
    totals.set(key(h), (totals.get(key(h)) ?? 0) + positionValue(h));
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const sorted = [...totals.entries()]
    .map(([label, value]) => ({
      label,
      value,
      weight: total === 0 ? 0 : value / total,
    }))
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_SLICES) return sorted;
  const rest = sorted.slice(MAX_SLICES - 1);
  const other = rest.reduce((sum, s) => sum + s.value, 0);
  return [
    ...sorted.slice(0, MAX_SLICES - 1),
    { label: 'Other', value: other, weight: total === 0 ? 0 : other / total },
  ];
}

/** One instrument across every platform that holds it. */
export type MergedHolding = {
  symbol: string;
  name: string;
  assetClass: Holding['assetClass'];
  platformIds: string[];
  quantity: number;
  price: number;
  value: number;
  weight: number;
  dayChange: number;
  dayChangePct: number;
  costBasis: number;
  unrealized: number;
  unrealizedPct: number;
};

/** Merge positions in the same instrument held on several platforms. */
export function mergeHoldings(holdings: readonly Holding[]): MergedHolding[] {
  const bySymbol = new Map<string, Holding[]>();
  for (const h of holdings) {
    bySymbol.set(h.symbol, [...(bySymbol.get(h.symbol) ?? []), h]);
  }
  const total = holdings.reduce((sum, h) => sum + positionValue(h), 0);
  return [...bySymbol.values()]
    .map((positions) => {
      const [head] = positions;
      const totals = portfolioTotals(positions);
      return {
        symbol: head.symbol,
        name: head.name,
        assetClass: head.assetClass,
        platformIds: [...new Set(positions.map((p) => p.platformId))],
        quantity: positions.reduce((sum, p) => sum + p.quantity, 0),
        price: head.price,
        value: totals.value,
        weight: total === 0 ? 0 : totals.value / total,
        dayChange: totals.dayChange,
        dayChangePct: totals.dayChangePct,
        costBasis: totals.cost,
        unrealized: totals.unrealized,
        unrealizedPct: totals.unrealizedPct,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** Concentration warnings an investor should know about, plain-language. */
export function concentrationWarnings(holdings: readonly Holding[]): string[] {
  const warnings: string[] = [];
  const top = mergeHoldings(holdings)[0];
  if (top && top.weight > POSITION_CONCENTRATION) {
    warnings.push(
      `${top.symbol} is ${Math.round(top.weight * 100)}% of your portfolio.`
    );
  }
  const sector = allocation(holdings, (h) => h.sector)[0];
  if (sector && sector.weight > SECTOR_CONCENTRATION) {
    warnings.push(
      `${sector.label} makes up ${Math.round(sector.weight * 100)}% of your holdings.`
    );
  }
  return warnings;
}

/** Dividend income received and expected, with the yield on today's value. */
export function incomeSummary(
  holdings: readonly Holding[],
  upcoming: readonly UpcomingDividend[]
) {
  const value = holdings.reduce((sum, h) => sum + positionValue(h), 0);
  const trailing = holdings.reduce((sum, h) => sum + h.dividendsTtm, 0);
  const forward = holdings.reduce((sum, h) => sum + h.dividendsNext12m, 0);
  return {
    trailing,
    forward,
    forwardYield: value === 0 ? 0 : forward / value,
    upcoming: [...upcoming].sort((a, b) => a.payDate.localeCompare(b.payDate)),
  };
}
