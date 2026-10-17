import { type Accessor, createMemo, createSignal } from 'solid-js';
import {
  movers,
  search,
  sectorPerformance,
  seriesFor,
} from '../core/market-metrics';
import {
  type AssetClass,
  type ChartRange,
  GICS_SECTORS,
  GROUPS,
  type MarketSnapshot,
} from '../core/types';

export type MarketsTab = 'Overview' | AssetClass;

/** The Markets page's state: the open tab, search, group filter and the instrument in focus. */
export function createMarketsViewState(snapshot: Accessor<MarketSnapshot>) {
  const [tab, setTab] = createSignal<MarketsTab>('Overview');
  const [query, setQuery] = createSignal('');
  const [group, setGroup] = createSignal<string | undefined>();
  const [focused, setFocused] = createSignal<string | undefined>();
  const [range, setRange] = createSignal<ChartRange>('1D');

  const openTab = (next: MarketsTab) => {
    setTab(next);
    setGroup(undefined);
  };

  const results = createMemo(() =>
    search(snapshot().instruments, query()).slice(0, 8)
  );

  /** The open tab's instruments, grouped in their standard order. */
  const groups = createMemo(() => {
    const current = tab();
    if (current === 'Overview') return [];
    return GROUPS[current]
      .filter((name) => !group() || group() === name)
      .map((name) => ({
        name,
        instruments: snapshot().instruments.filter(
          (i) => i.assetClass === current && i.group === name
        ),
      }))
      .filter((g) => g.instruments.length > 0);
  });

  const focusedInstrument = createMemo(() =>
    snapshot().instruments.find((i) => i.symbol === focused())
  );
  const focusedSeries = createMemo(() => {
    const symbol = focused();
    return symbol ? seriesFor(snapshot(), symbol, range()) : [];
  });

  return {
    tab,
    openTab,
    query,
    setQuery,
    results,
    group,
    setGroup,
    groups,
    focus: (symbol: string | undefined) => {
      setFocused(symbol);
      setRange('1D');
    },
    focusedInstrument,
    focusedSeries,
    range,
    setRange,
    movers: createMemo(() => movers(snapshot().instruments)),
    sectors: createMemo(() =>
      sectorPerformance(snapshot().instruments, GICS_SECTORS)
    ),
    bySymbol: (symbol: string) =>
      snapshot().instruments.find((i) => i.symbol === symbol),
    sparkline: (symbol: string) => seriesFor(snapshot(), symbol, '1M'),
  };
}

export type MarketsViewState = ReturnType<typeof createMarketsViewState>;
