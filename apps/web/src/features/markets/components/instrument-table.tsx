import { Button, cn } from '@ui';
import { For, Show } from 'solid-js';
import { formatMarketCap, formatPrice } from '../core/format';
import { rangePosition } from '../core/market-metrics';
import type { AssetClass, Instrument } from '../core/types';
import { ChangeText } from './quote-parts';

/** Today's price within its 52-week low–high, as a small track with a marker. */
export function RangeBar(props: { instrument: Instrument }) {
  return (
    <span
      class="relative block h-1 w-20 rounded-full bg-surface-3"
      title={`52-week range ${formatPrice(props.instrument, props.instrument.week52Low)} – ${formatPrice(props.instrument, props.instrument.week52High)}`}
    >
      <span
        class="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-panel"
        style={{ left: `${rangePosition(props.instrument) * 100}%` }}
      />
    </span>
  );
}

const showsFundamentals = (assetClass: AssetClass) =>
  assetClass === 'Stocks' || assetClass === 'ETFs';

/** Group chips: one per category in the open tab, plus All. */
export function GroupChips(props: {
  groups: readonly string[];
  active: string | undefined;
  onChange: (group: string | undefined) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by category"
      class="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]"
    >
      <Button
        variant="outline"
        size="sm"
        aria-pressed={!props.active}
        class={cn('shrink-0', !props.active && 'text-ink ring-1 ring-edge')}
        onClick={() => props.onChange(undefined)}
      >
        All
      </Button>
      <For each={props.groups}>
        {(group) => (
          <Button
            variant="outline"
            size="sm"
            aria-pressed={props.active === group}
            class={cn(
              'shrink-0 transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none',
              props.active === group && 'text-ink ring-1 ring-edge'
            )}
            onClick={() => props.onChange(group)}
          >
            {group}
          </Button>
        )}
      </For>
    </div>
  );
}

/** One asset class as grouped rows, columns chosen for that class. */
export function InstrumentTable(props: {
  assetClass: AssetClass;
  groups: readonly { name: string; instruments: readonly Instrument[] }[];
  onOpen: (symbol: string) => void;
}) {
  const fundamentals = () => showsFundamentals(props.assetClass);
  return (
    <div class="flex flex-col gap-4">
      <For each={props.groups}>
        {(group) => (
          <section
            aria-label={group.name}
            class="overflow-hidden rounded-xl border border-edge-muted bg-panel"
          >
            <h3 class="border-b border-edge-muted px-4 py-2 text-xs font-medium text-ink-muted">
              {group.name}
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[560px] text-sm">
                <thead class="sr-only">
                  <tr>
                    <th>Instrument</th>
                    <th>Price</th>
                    <th>Change</th>
                    <Show when={fundamentals()}>
                      <th>Market cap</th>
                      <th>P/E</th>
                      <th>Dividend yield</th>
                    </Show>
                    <th>52-week range</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={group.instruments}>
                    {(instrument) => (
                      <tr
                        class="cursor-default border-t border-edge-muted first:border-t-0 not-touch:hover:overlay-hover"
                        onClick={() => props.onOpen(instrument.symbol)}
                      >
                        <td class="px-4 py-2">
                          <button
                            type="button"
                            class="flex min-w-0 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-edge-focus rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onOpen(instrument.symbol);
                            }}
                          >
                            <span class="font-medium text-ink">
                              {instrument.symbol}
                            </span>
                            <span class="truncate text-xs text-ink-muted">
                              {instrument.name}
                              <Show when={instrument.exchange}>
                                {(exchange) => ` · ${exchange()}`}
                              </Show>
                            </span>
                          </button>
                        </td>
                        <td class="px-2 py-2 text-right tabular-nums text-ink">
                          {formatPrice(instrument)}
                        </td>
                        <td class="px-2 py-2 text-right">
                          <ChangeText instrument={instrument} />
                        </td>
                        <Show when={fundamentals()}>
                          <td class="px-2 py-2 text-right tabular-nums text-ink-muted">
                            {instrument.marketCap
                              ? formatMarketCap(
                                  instrument.marketCap,
                                  instrument.currency
                                )
                              : '—'}
                          </td>
                          <td class="px-2 py-2 text-right tabular-nums text-ink-muted">
                            {instrument.peRatio
                              ? instrument.peRatio.toFixed(1)
                              : '—'}
                          </td>
                          <td class="px-2 py-2 text-right tabular-nums text-ink-muted">
                            {instrument.dividendYield
                              ? `${(instrument.dividendYield * 100).toFixed(2)}%`
                              : '—'}
                          </td>
                        </Show>
                        <td class="py-2 pl-2 pr-4">
                          <div class="flex justify-end">
                            <RangeBar instrument={instrument} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </For>
    </div>
  );
}
