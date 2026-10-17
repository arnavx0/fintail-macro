import { SegmentedControl } from '@ui';
import { createMemo, createSignal, For } from 'solid-js';
import type { Movers, SectorMove } from '../core/market-metrics';
import { ChangeText, changeInk, Panel, Price } from './quote-parts';

const pct = (share: number) =>
  `${share > 0 ? '+' : share < 0 ? '−' : ''}${Math.abs(share * 100).toFixed(2)}%`;

/**
 * Today's move for each GICS sector of US large caps, weighted by market
 * capitalisation: a diverging bar from a zero line, gains right, losses left.
 */
export function SectorPerformance(props: { sectors: readonly SectorMove[] }) {
  const sorted = createMemo(() =>
    [...props.sectors].sort((a, b) => b.share - a.share)
  );
  const scale = createMemo(() =>
    Math.max(0.0001, ...props.sectors.map((s) => Math.abs(s.share)))
  );
  return (
    <Panel title="S&P 500 sectors today">
      <ul class="flex flex-col gap-1.5">
        <For each={sorted()}>
          {(sector) => {
            const width = () => `${(Math.abs(sector.share) / scale()) * 50}%`;
            return (
              <li class="grid grid-cols-[minmax(0,9rem)_1fr_3.75rem] items-center gap-2 text-xs">
                <span class="truncate text-ink">{sector.sector}</span>
                <span class="relative h-2.5" aria-hidden="true">
                  <span class="absolute inset-y-0 left-1/2 w-px bg-edge" />
                  <span
                    class="absolute inset-y-0 rounded-[3px] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{
                      width: width(),
                      left: sector.share >= 0 ? '50%' : undefined,
                      right: sector.share < 0 ? '50%' : undefined,
                      background:
                        sector.share >= 0
                          ? 'var(--color-green)'
                          : 'var(--color-red)',
                    }}
                  />
                </span>
                <span
                  class={`text-right tabular-nums ${changeInk(sector.share)}`}
                >
                  {pct(sector.share)}
                </span>
              </li>
            );
          }}
        </For>
      </ul>
    </Panel>
  );
}

type MoverKind = 'Gainers' | 'Losers' | 'Most active';

/** The day's biggest movers among stocks. */
export function MoversCard(props: {
  movers: Movers;
  onOpen: (symbol: string) => void;
}) {
  const [kind, setKind] = createSignal<MoverKind>('Gainers');
  const list = () =>
    kind() === 'Gainers'
      ? props.movers.gainers
      : kind() === 'Losers'
        ? props.movers.losers
        : props.movers.active;
  return (
    <Panel
      title="Movers"
      action={
        <SegmentedControl
          size="sm"
          aria-label="Movers"
          value={kind()}
          options={(['Gainers', 'Losers', 'Most active'] as const).map((k) => ({
            value: k,
            label: k,
          }))}
          onChange={setKind}
        />
      }
    >
      <ul class="flex flex-col divide-y divide-edge-muted">
        <For each={list()}>
          {(instrument) => (
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-edge-focus not-touch:hover:overlay-hover"
                onClick={() => props.onOpen(instrument.symbol)}
              >
                <span class="w-14 shrink-0 font-medium text-ink">
                  {instrument.symbol}
                </span>
                <span class="min-w-0 flex-1 truncate text-xs text-ink-muted">
                  {instrument.name}
                </span>
                <Price instrument={instrument} class="tabular-nums text-ink" />
                <ChangeText instrument={instrument} class="w-16 text-right" />
              </button>
            </li>
          )}
        </For>
      </ul>
    </Panel>
  );
}
