import type {
  ChartRange,
  Instrument,
  MarketSnapshot,
  PricePoint,
} from './types';

/** Change since the previous close, absolute and as a share. Rates change in percentage points. */
export function change(instrument: Instrument) {
  const amount = instrument.price - instrument.previousClose;
  return {
    amount,
    share:
      instrument.previousClose === 0 ? 0 : amount / instrument.previousClose,
  };
}

/** Where today's price sits in its 52-week range, 0 at the low and 1 at the high. */
export function rangePosition(instrument: Instrument) {
  const span = instrument.week52High - instrument.week52Low;
  if (span <= 0) return 0.5;
  return Math.min(
    1,
    Math.max(0, (instrument.price - instrument.week52Low) / span)
  );
}

export type Movers = {
  gainers: Instrument[];
  losers: Instrument[];
  active: Instrument[];
};

/** Top gainers, losers and most active (by traded value) among stocks. */
export function movers(instruments: readonly Instrument[], count = 5): Movers {
  const stocks = instruments.filter((i) => i.assetClass === 'Stocks');
  const byChange = [...stocks].sort(
    (a, b) => change(b).share - change(a).share
  );
  return {
    gainers: byChange.filter((i) => change(i).share > 0).slice(0, count),
    losers: byChange
      .filter((i) => change(i).share < 0)
      .reverse()
      .slice(0, count),
    active: [...stocks]
      .sort((a, b) => (b.volume ?? 0) * b.price - (a.volume ?? 0) * a.price)
      .slice(0, count),
  };
}

export type SectorMove = { sector: string; share: number; count: number };

/**
 * Today's move per GICS sector, weighted by market capitalisation like the
 * S&P 500 sector indices, for US stocks only.
 */
export function sectorPerformance(
  instruments: readonly Instrument[],
  sectors: readonly string[]
): SectorMove[] {
  return sectors
    .map((sector) => {
      const members = instruments.filter(
        (i) =>
          i.assetClass === 'Stocks' && i.market === 'US' && i.group === sector
      );
      const cap = members.reduce((sum, i) => sum + (i.marketCap ?? 0), 0);
      const share =
        cap === 0
          ? 0
          : members.reduce(
              (sum, i) => sum + (i.marketCap ?? 0) * change(i).share,
              0
            ) / cap;
      return { sector, share, count: members.length };
    })
    .filter((s) => s.count > 0);
}

/**
 * Instruments matching a search, best first: exact symbol, symbol prefix,
 * name word prefix, then anywhere in the name.
 */
export function search(
  instruments: readonly Instrument[],
  query: string
): Instrument[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rank = (i: Instrument) => {
    const symbol = i.symbol.toLowerCase();
    const name = i.name.toLowerCase();
    if (symbol === q) return 0;
    if (symbol.startsWith(q)) return 1;
    if (name.split(/[\s/&.-]+/).some((word) => word.startsWith(q))) return 2;
    if (name.includes(q) || symbol.includes(q)) return 3;
    return -1;
  };
  return instruments
    .map((i) => ({ i, r: rank(i) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r || (b.i.marketCap ?? 0) - (a.i.marketCap ?? 0))
    .map(({ i }) => i);
}

const RANGE_DAYS: Record<Exclude<ChartRange, '1D'>, number> = {
  '1W': 5,
  '1M': 21,
  '3M': 63,
  '1Y': 252,
};

/** The price series for a chart range: today's intraday or the last N trading days. */
export function seriesFor(
  snapshot: MarketSnapshot,
  symbol: string,
  range: ChartRange
): readonly PricePoint[] {
  if (range === '1D') return snapshot.intraday[symbol] ?? [];
  const daily = snapshot.daily[symbol] ?? [];
  return daily.slice(-(RANGE_DAYS[range] + 1));
}

/** Change across a series, first to last. */
export function seriesChange(points: readonly PricePoint[]) {
  const first = points[0]?.price ?? 0;
  const last = points.at(-1)?.price ?? 0;
  return {
    amount: last - first,
    share: first === 0 ? 0 : (last - first) / first,
  };
}
