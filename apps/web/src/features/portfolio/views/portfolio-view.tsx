import { AnimatedNumber } from '@core/component/AnimatedNumber';
import SparkleIcon from '@phosphor/sparkle.svg';
import { Button } from '@ui';
import { createMemo, For, Show } from 'solid-js';
import { AllocationCard } from '../components/allocation-card';
import { Change } from '../components/figures';
import { HoldingsTable } from '../components/holdings-table';
import { IncomeCard, ReturnCard, RiskCard } from '../components/insight-cards';
import { PerformanceChart } from '../components/performance-chart';
import { PlatformPills } from '../components/platform-pills';
import { usePortfolioSource } from '../context/portfolio-context';
import { formatMoney } from '../core/format';
import type { PortfolioSnapshot } from '../core/types';
import { RANGES, type RangeId } from '../core/types';
import {
  ALLOCATION_LENSES,
  type AllocationLens,
  createPortfolioViewState,
} from '../primitives/portfolio-view-state';

const RANGE_LABEL: Record<RangeId, string> = {
  '1W': 'past week',
  '1M': 'past month',
  '3M': 'past 3 months',
  YTD: 'year to date',
  '1Y': 'past year',
  ALL: 'all time',
};

/** Questions the AI answers from the user's own numbers. */
const ASK: { label: string; prompt: string }[] = [
  {
    label: 'Why did I move today?',
    prompt:
      'Why did my portfolio move today? Break it down by holding and link any news. Information only, no buy or sell advice.',
  },
  {
    label: 'Am I diversified?',
    prompt:
      'Review my portfolio’s diversification across asset classes, sectors and regions, and point out concentration risks. Information only, no buy or sell advice.',
  },
  {
    label: 'Me vs the S&P 500',
    prompt:
      'Compare my portfolio’s performance with the S&P 500 over the past year and explain what drove the difference. Information only.',
  },
  {
    label: 'My dividend income',
    prompt:
      'Summarise my dividend income: what I received in the last 12 months, what is expected next, and upcoming pay dates.',
  },
];

/** Every brokerage and crypto account in one view, filtered by platform. */
export function PortfolioView(props: { onAsk: (prompt: string) => void }) {
  const source = usePortfolioSource();
  return (
    <Show when={source.snapshot()}>
      {(snapshot) => (
        <PortfolioPage
          snapshot={snapshot()}
          isSample={source.isSample()}
          onAsk={props.onAsk}
        />
      )}
    </Show>
  );
}

function PortfolioPage(props: {
  snapshot: PortfolioSnapshot;
  isSample: boolean;
  onAsk: (prompt: string) => void;
}) {
  const state = createPortfolioViewState(() => props.snapshot);
  const currency = () => props.snapshot.baseCurrency;

  /** Every label each lens can show, so colours never move when filtering. */
  const colorKeys = createMemo(() => {
    const { holdings } = props.snapshot;
    const keys = (key: (h: (typeof holdings)[number]) => string) =>
      [...new Set(holdings.map(key))].sort();
    const byLens: Record<AllocationLens, string[]> = {
      'Asset class': keys((h) => h.assetClass),
      Sector: keys((h) => h.sector),
      Region: keys((h) => h.region),
      Platform: keys((h) => state.platformName(h.platformId)),
    };
    return byLens[state.lens()];
  });

  /** Changes whenever the figures do, so cards ease in on every filter. */
  const motionKey = () =>
    `${[...state.selected()].sort().join(',')}|${state.range()}|${state.lens()}`;

  const asOf = () =>
    new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${props.snapshot.asOf}T00:00:00Z`));

  return (
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 mobile:pt-(--mobile-content-inset-top) mobile:pb-(--mobile-content-inset-bottom)">
      <Show when={props.isSample}>
        <p class="rounded-lg border border-edge-muted bg-accent-bg px-3 py-2 text-xs text-ink-muted">
          <span class="font-medium text-accent-ink">Sample portfolio.</span>{' '}
          Illustrative accounts and prices so you can explore Fintail. Connect a
          broker to see your own.
        </p>
      </Show>

      <header class="flex flex-col gap-3">
        <PlatformPills
          platforms={props.snapshot.platforms}
          selected={state.selected()}
          onToggle={state.togglePlatform}
          onClear={state.clearPlatforms}
        />
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-ink-muted">Total value · {asOf()}</span>
            <span class="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              <AnimatedNumber
                value={state.totals().value}
                format={(v) => formatMoney(v, currency())}
              />
            </span>
            <span class="text-sm">
              <Change
                amount={state.totals().dayChange}
                share={state.totals().dayChangePct}
                currency={currency()}
              />{' '}
              <span class="text-ink-muted">today</span>
            </span>
          </div>
        </div>
        <div
          role="group"
          aria-label="Ask Fintail"
          class="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]"
        >
          <For each={ASK}>
            {(question) => (
              <Button
                variant="accent"
                size="sm"
                class="shrink-0 gap-1.5"
                onClick={() => props.onAsk(question.prompt)}
              >
                <SparkleIcon class="size-3.5" />
                {question.label}
              </Button>
            )}
          </For>
        </div>
      </header>

      <PerformanceChart
        motionKey={motionKey()}
        points={state.chartSeries()}
        currency={currency()}
        benchmarkName={props.snapshot.benchmark.name}
        range={state.range()}
        ranges={RANGES}
        onRange={state.setRange}
      />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReturnCard
          motionKey={motionKey()}
          currency={currency()}
          rangeLabel={RANGE_LABEL[state.range()]}
          moneyWeighted={state.performance().moneyWeighted}
          timeWeighted={state.performance().timeWeighted}
          benchmark={state.performance().benchmark}
          benchmarkName={props.snapshot.benchmark.name}
          gain={state.performance().gain}
          deposits={state.performance().deposits}
          unrealized={state.totals().unrealized}
          unrealizedPct={state.totals().unrealizedPct}
        />
        <RiskCard
          motionKey={motionKey()}
          volatility={state.risk().volatility}
          maxDrawdown={state.risk().maxDrawdown}
          largestWeight={state.risk().largestWeight}
          warnings={state.risk().warnings}
        />
        <AllocationCard
          motionKey={motionKey()}
          slices={state.slices()}
          colorKeys={colorKeys()}
          currency={currency()}
          lens={state.lens()}
          lenses={ALLOCATION_LENSES}
          onLens={state.setLens}
        />
        <IncomeCard
          motionKey={motionKey()}
          currency={currency()}
          trailing={state.income().trailing}
          forward={state.income().forward}
          forwardYield={state.income().forwardYield}
          upcoming={state.income().upcoming}
        />
      </div>

      <HoldingsTable
        motionKey={motionKey()}
        holdings={state.holdings()}
        platforms={props.snapshot.platforms}
        currency={currency()}
        onAsk={props.onAsk}
      />

      <p class="pb-2 text-center text-[11px] text-ink-extra-muted">
        Information, not financial advice. Returns are calculated from your
        account history; past performance does not predict future results.
      </p>
    </div>
  );
}
