import SparkleIcon from '@phosphor/sparkle.svg';
import XIcon from '@phosphor/x.svg';
import { Button, Dialog, SegmentedControl, Surface } from '@ui';
import { For, type JSX, Show } from 'solid-js';
import { formatMarketCap, formatPrice, formatVolume } from '../core/format';
import { seriesChange } from '../core/market-metrics';
import {
  CHART_RANGES,
  type ChartRange,
  type Instrument,
  type PricePoint,
} from '../core/types';
import { RangeBar } from './instrument-table';
import { PriceChart } from './price-chart';
import { ChangeText, changeInk, Price } from './quote-parts';

/** One instrument in depth: price, chart, key statistics, the user's position and Ask Fintail. */
export function InstrumentDetail(props: {
  instrument: Instrument | undefined;
  points: readonly PricePoint[];
  range: ChartRange;
  onRange: (range: ChartRange) => void;
  position?: string;
  onAsk: (prompt: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={props.instrument !== undefined}
      onOpenChange={(open) => !open && props.onClose()}
      class="w-2xl"
    >
      <Show when={props.instrument}>
        {(instrument) => (
          <Surface depth={2} class="rounded-xl">
            <div class="flex max-h-[85vh] flex-col overflow-y-auto text-ink">
              <div class="flex items-start gap-3 border-b border-edge-muted p-4">
                <div class="min-w-0 flex-1">
                  <Dialog.Title as="h2" class="m-0 p-0 text-base font-semibold">
                    {instrument().symbol}
                  </Dialog.Title>
                  <p class="truncate text-xs text-ink-muted">
                    {instrument().name}
                    <Show when={instrument().exchange}>
                      {(exchange) => ` · ${exchange()}`}
                    </Show>
                    {` · ${instrument().assetClass} · ${instrument().group}`}
                  </p>
                </div>
                <Dialog.CloseButton
                  as={Button}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close"
                >
                  <XIcon />
                </Dialog.CloseButton>
              </div>

              <div class="flex flex-col gap-4 p-4">
                <div class="flex flex-wrap items-end justify-between gap-3">
                  <div class="flex flex-col">
                    <Price
                      instrument={instrument()}
                      class="text-3xl font-semibold"
                    />
                    <span class="text-sm">
                      <ChangeText instrument={instrument()} />{' '}
                      <span class="text-ink-muted">today</span>
                    </span>
                  </div>
                  <SegmentedControl
                    size="sm"
                    aria-label="Chart range"
                    value={props.range}
                    options={CHART_RANGES.map((r) => ({ value: r, label: r }))}
                    onChange={props.onRange}
                  />
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  <span>{props.range} change</span>
                  <span class={changeInk(seriesChange(props.points).amount)}>
                    {`${seriesChange(props.points).share >= 0 ? '+' : '−'}${Math.abs(seriesChange(props.points).share * 100).toFixed(2)}%`}
                  </span>
                </div>

                <PriceChart
                  instrument={instrument()}
                  points={props.points}
                  range={props.range}
                />

                <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                  <For each={stats(instrument())}>
                    {(stat) => (
                      <div class="flex flex-col gap-0.5">
                        <dt class="text-ink-muted">{stat.label}</dt>
                        <dd class="tabular-nums font-medium text-ink">
                          {stat.value}
                        </dd>
                      </div>
                    )}
                  </For>
                </dl>

                <div class="flex items-center gap-3 text-xs text-ink-muted">
                  <span>52-week range</span>
                  <span class="tabular-nums">
                    {formatPrice(instrument(), instrument().week52Low)}
                  </span>
                  <RangeBar instrument={instrument()} />
                  <span class="tabular-nums">
                    {formatPrice(instrument(), instrument().week52High)}
                  </span>
                </div>

                <Show when={props.position}>
                  {(position) => (
                    <p class="rounded-lg bg-accent-bg px-3 py-2 text-xs text-ink">
                      {position()}
                    </p>
                  )}
                </Show>

                <Button
                  variant="accent"
                  size="md"
                  class="self-start gap-1.5"
                  onClick={() =>
                    props.onAsk(
                      `Give me an overview of ${instrument().name} (${instrument().symbol}): today's move, recent trend, key statistics, and any news. ${props.position ? 'Relate it to my position. ' : ''}Information only, no buy or sell advice.`
                    )
                  }
                >
                  <SparkleIcon class="size-4" />
                  Ask Fintail about {instrument().symbol}
                </Button>
              </div>
            </div>
          </Surface>
        )}
      </Show>
    </Dialog>
  );
}

function stats(i: Instrument): { label: string; value: JSX.Element }[] {
  const rows: { label: string; value: JSX.Element }[] = [
    { label: 'Previous close', value: formatPrice(i, i.previousClose) },
    {
      label: 'Day range',
      value: `${formatPrice(i, i.dayLow)} – ${formatPrice(i, i.dayHigh)}`,
    },
  ];
  if (i.marketCap)
    rows.push({
      label: 'Market cap',
      value: formatMarketCap(i.marketCap, i.currency),
    });
  if (i.peRatio) rows.push({ label: 'P/E ratio', value: i.peRatio.toFixed(1) });
  if (i.dividendYield) {
    rows.push({
      label: 'Dividend yield',
      value: `${(i.dividendYield * 100).toFixed(2)}%`,
    });
  }
  if (i.volume) rows.push({ label: 'Volume', value: formatVolume(i.volume) });
  return rows;
}
