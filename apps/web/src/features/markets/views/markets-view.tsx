import { DataSourcesDialog } from '@app/features/connectors/components/data-sources-dialog';
import { dataSourcesCount } from '@app/features/connectors/core/catalogue';
import type { Connections } from '@app/features/connectors/primitives/connections';
import DatabaseIcon from '@phosphor/database.svg';
import { Button, Tabs } from '@ui';
import { createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { InstrumentDetail } from '../components/instrument-detail';
import { GroupChips, InstrumentTable } from '../components/instrument-table';
import { MarketSearch } from '../components/market-search';
import { MoversCard, SectorPerformance } from '../components/overview-cards';
import { Panel, QuoteCard, TickerStrip } from '../components/quote-parts';
import { useMarketSource } from '../context/markets-context';
import { instrumentAnalysis } from '../core/analysis';
import {
  ASSET_CLASSES,
  type AssetClass,
  GROUPS,
  type MarketSnapshot,
} from '../core/types';
import {
  createMarketsViewState,
  type MarketsTab,
} from '../primitives/markets-view-state';

/** Headline quotes for the scrolling strip, in the order desks watch them. */
const TICKER = [
  'SPX',
  'IXIC',
  'DJI',
  'VIX',
  'US10Y',
  'USD/SGD',
  'EUR/USD',
  'GC',
  'CL',
  'BTC',
];

/** The index regions shown on the Overview, in order. */
const OVERVIEW_GROUPS: { title: string; symbols: string[] }[] = [
  {
    title: 'United States',
    symbols: ['SPX', 'IXIC', 'NDX', 'DJI', 'RUT', 'VIX'],
  },
  { title: 'Europe', symbols: ['UKX', 'DAX', 'CAC', 'SX5E'] },
  {
    title: 'Asia-Pacific',
    symbols: ['N225', 'HSI', 'STI', 'AS51', 'KOSPI', 'SHCOMP'],
  },
  {
    title: 'Currencies & crypto',
    symbols: ['USD/SGD', 'EUR/USD', 'USD/JPY', 'BTC', 'ETH', 'GC'],
  },
];

const TABS: MarketsTab[] = ['Overview', ...ASSET_CLASSES];

/** Public markets: indices, stocks, ETFs, forex, crypto, commodities and rates. */
export function MarketsView(props: {
  onAsk: (prompt: string) => void;
  positionFor?: (symbol: string) => string | undefined;
  connections: Connections;
  onManageConnections: () => void;
}) {
  const source = useMarketSource();
  return (
    <Show when={source.snapshot()}>
      {(snapshot) => (
        <MarketsPage
          snapshot={snapshot()}
          isSample={source.isSample()}
          onAsk={props.onAsk}
          positionFor={props.positionFor}
          connections={props.connections}
          onManageConnections={props.onManageConnections}
        />
      )}
    </Show>
  );
}

function MarketsPage(props: {
  snapshot: MarketSnapshot;
  isSample: boolean;
  onAsk: (prompt: string) => void;
  positionFor?: (symbol: string) => string | undefined;
  connections: Connections;
  onManageConnections: () => void;
}) {
  const [sourcesOpen, setSourcesOpen] = createSignal(false);
  const state = createMarketsViewState(() => props.snapshot);
  const ticker = createMemo(() =>
    TICKER.map(state.bySymbol).filter((i) => i !== undefined)
  );
  /** The focused instrument's on-the-spot analysis, from its own numbers. */
  const analysis = createMemo(() => {
    const instrument = state.focusedInstrument();
    if (!instrument) return [];
    return instrumentAnalysis({
      instrument,
      daily: props.snapshot.daily[instrument.symbol] ?? [],
      peers: props.snapshot.instruments.filter(
        (i) =>
          i.assetClass === instrument.assetClass && i.group === instrument.group
      ),
      position: props.positionFor?.(instrument.symbol),
    });
  });

  const asOf = () =>
    new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${props.snapshot.asOf}T00:00:00Z`));

  return (
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 mobile:pt-(--mobile-content-inset-top) mobile:pb-(--mobile-content-inset-bottom)">
      <Show when={props.isSample}>
        <p class="rounded-lg border border-edge-muted bg-accent-bg px-3 py-2 text-xs text-ink-muted">
          <span class="font-medium text-accent-ink">Sample market data.</span>{' '}
          Illustrative prices so you can explore Fintail; live quotes arrive
          with a licensed data provider.
        </p>
      </Show>

      <header class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-baseline gap-3">
            <h1 class="text-2xl font-semibold tracking-tight text-ink">
              Markets
            </h1>
            <span class="text-xs text-ink-muted">Close · {asOf()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="gap-1.5"
            onClick={() => setSourcesOpen(true)}
          >
            <DatabaseIcon class="size-4" />
            Data sources
            <span class="rounded-full bg-accent-bg px-1.5 text-[10px] font-semibold text-accent-ink tabular-nums">
              {dataSourcesCount(props.connections.state())}
            </span>
          </Button>
        </div>
        <DataSourcesDialog
          open={sourcesOpen()}
          onOpenChange={setSourcesOpen}
          state={props.connections.state()}
          onService={props.connections.setService}
          onManageInSettings={() => {
            setSourcesOpen(false);
            props.onManageConnections();
          }}
        />
        <MarketSearch
          query={state.query()}
          results={state.results()}
          onQuery={state.setQuery}
          onOpen={state.focus}
        />
        <TickerStrip instruments={ticker()} onOpen={state.focus} />
        <Tabs
          aria-label="Asset class"
          list={TABS.map((tab) => ({ value: tab, label: tab }))}
          value={state.tab()}
          onChange={(value) => state.openTab(value as MarketsTab)}
        />
      </header>

      <Switch>
        <Match when={state.tab() === 'Overview'}>
          <For each={OVERVIEW_GROUPS}>
            {(group) => (
              <section aria-label={group.title} class="flex flex-col gap-2">
                <h2 class="text-sm font-medium text-ink">{group.title}</h2>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <For each={group.symbols}>
                    {(symbol) => (
                      <Show when={state.bySymbol(symbol)}>
                        {(instrument) => (
                          <QuoteCard
                            instrument={instrument()}
                            points={state.sparkline(symbol)}
                            onOpen={state.focus}
                          />
                        )}
                      </Show>
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectorPerformance sectors={state.sectors()} />
            <MoversCard movers={state.movers()} onOpen={state.focus} />
          </div>
        </Match>
        <Match when={state.tab() !== 'Overview'}>
          <GroupChips
            groups={GROUPS[state.tab() as AssetClass]}
            active={state.group()}
            onChange={state.setGroup}
          />
          <InstrumentTable
            assetClass={state.tab() as AssetClass}
            groups={state.groups()}
            onOpen={state.focus}
          />
        </Match>
      </Switch>

      <Panel title="About this data" class="text-xs text-ink-muted">
        <p>
          Stocks are grouped by GICS sector; sector moves are weighted by market
          capitalisation. Yields move in basis points. Information, not
          financial advice.
        </p>
      </Panel>

      <InstrumentDetail
        instrument={state.focusedInstrument()}
        points={state.focusedSeries()}
        range={state.range()}
        onRange={state.setRange}
        position={
          state.focusedInstrument()
            ? props.positionFor?.(state.focusedInstrument()!.symbol)
            : undefined
        }
        analysis={analysis()}
        onAsk={props.onAsk}
        onClose={() => state.focus(undefined)}
      />
    </div>
  );
}
