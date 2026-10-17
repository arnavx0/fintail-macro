import { cn } from '@ui';
import { createMemo, createSignal, For } from 'solid-js';
import { formatMoney, formatSignedPercent, formatWeight } from '../core/format';
import type { MergedHolding } from '../core/metrics';
import type { Platform } from '../core/types';
import { changeClass, Section } from './figures';
import { PlatformBadge } from './platform-badge';

type SortKey = 'value' | 'dayChangePct' | 'unrealizedPct';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'value', label: 'Value' },
  { key: 'dayChangePct', label: 'Today' },
  { key: 'unrealizedPct', label: 'Total P/L' },
];

/**
 * "What do I own and how is each doing?" One row per instrument across all
 * selected platforms; the badges show where it is held. Rows ask the AI.
 */
export function HoldingsTable(props: {
  holdings: readonly MergedHolding[];
  platforms: readonly Platform[];
  currency: string;
  onAsk: (prompt: string) => void;
}) {
  const [sort, setSort] = createSignal<SortKey>('value');
  const rows = createMemo(() =>
    [...props.holdings].sort((a, b) => b[sort()] - a[sort()])
  );
  const platform = (id: string) => props.platforms.find((p) => p.id === id);

  return (
    <Section title="Holdings">
      <div class="-mx-4 overflow-x-auto">
        <table class="w-full min-w-[520px] text-sm">
          <thead>
            <tr class="text-xs text-ink-muted">
              <th class="px-4 pb-2 text-left font-normal">Holding</th>
              <th class="px-2 pb-2 text-right font-normal">Weight</th>
              <For each={COLUMNS}>
                {(column) => (
                  <th
                    class="px-2 pb-2 text-right font-normal last:pr-4"
                    aria-sort={sort() === column.key ? 'descending' : 'none'}
                  >
                    <button
                      type="button"
                      class={cn(
                        'rounded px-1 not-touch:hover:text-ink focus-visible:ring-2 focus-visible:ring-edge-focus outline-none',
                        sort() === column.key && 'text-ink'
                      )}
                      onClick={() => setSort(column.key)}
                    >
                      {column.label}
                      <span aria-hidden="true">
                        {sort() === column.key ? ' ↓' : ''}
                      </span>
                    </button>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(holding) => (
                <tr class="group border-t border-edge-muted">
                  <td class="px-4 py-2">
                    <button
                      type="button"
                      class="flex w-full items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-edge-focus rounded"
                      title={`Ask Fintail about ${holding.symbol}`}
                      onClick={() =>
                        props.onAsk(
                          `Explain how ${holding.symbol} (${holding.name}) is doing in my portfolio: its weight, my gain or loss, and recent news. Information only, no buy or sell advice.`
                        )
                      }
                    >
                      <div class="flex -space-x-1.5">
                        <For each={holding.platformIds}>
                          {(id) => {
                            const p = platform(id);
                            return p ? (
                              <PlatformBadge
                                platform={p}
                                class="size-4 ring-2 ring-panel"
                              />
                            ) : null;
                          }}
                        </For>
                      </div>
                      <div class="min-w-0">
                        <div class="font-medium text-ink">{holding.symbol}</div>
                        <div class="truncate text-xs text-ink-muted">
                          {holding.name}
                        </div>
                      </div>
                    </button>
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums text-ink-muted">
                    {formatWeight(holding.weight)}
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums text-ink">
                    {formatMoney(holding.value, props.currency)}
                  </td>
                  <td
                    class={cn(
                      'px-2 py-2 text-right tabular-nums',
                      changeClass(holding.dayChange)
                    )}
                  >
                    {formatSignedPercent(holding.dayChangePct)}
                  </td>
                  <td
                    class={cn(
                      'py-2 pl-2 pr-4 text-right tabular-nums',
                      changeClass(holding.unrealized)
                    )}
                  >
                    {formatSignedPercent(holding.unrealizedPct)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Section>
  );
}
