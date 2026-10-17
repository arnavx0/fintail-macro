import MagnifyingGlassIcon from '@phosphor/magnifying-glass.svg';
import { cn } from '@ui';
import { createSignal, For, Show } from 'solid-js';
import { formatPrice } from '../core/format';
import type { Instrument } from '../core/types';
import { ChangeText } from './quote-parts';

/**
 * Search every instrument by ticker or name. Arrow keys move through the
 * results, Enter opens one, Escape clears.
 */
export function MarketSearch(props: {
  query: string;
  results: readonly Instrument[];
  onQuery: (query: string) => void;
  onOpen: (symbol: string) => void;
}) {
  const [active, setActive] = createSignal(0);
  const open = (symbol: string) => {
    props.onOpen(symbol);
    props.onQuery('');
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const count = props.results.length;
    if (event.key === 'ArrowDown' && count > 0) {
      event.preventDefault();
      setActive((active() + 1) % count);
    } else if (event.key === 'ArrowUp' && count > 0) {
      event.preventDefault();
      setActive((active() - 1 + count) % count);
    } else if (event.key === 'Enter') {
      const pick = props.results[active()];
      if (pick) open(pick.symbol);
    } else if (event.key === 'Escape') {
      props.onQuery('');
    }
  };
  return (
    <div class="relative">
      <label class="flex h-10 items-center gap-2 rounded-xl border border-edge-muted bg-panel px-3 focus-within:border-accent">
        <MagnifyingGlassIcon class="size-4 shrink-0 text-ink-muted" />
        <span class="sr-only">Search markets</span>
        <input
          type="search"
          role="combobox"
          aria-expanded={props.results.length > 0}
          aria-controls="market-search-results"
          aria-activedescendant={
            props.results[active()] ? `market-result-${active()}` : undefined
          }
          placeholder="Search stocks, ETFs, indices, forex, crypto…"
          autocomplete="off"
          class="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
          value={props.query}
          onInput={(e) => {
            setActive(0);
            props.onQuery(e.currentTarget.value);
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      <Show when={props.results.length > 0}>
        <ul
          id="market-search-results"
          role="listbox"
          aria-label="Search results"
          class="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-edge-muted bg-menu py-1 shadow-lg"
        >
          <For each={props.results}>
            {(instrument, index) => (
              <li
                id={`market-result-${index()}`}
                role="option"
                aria-selected={active() === index()}
                class={cn(
                  'flex cursor-default items-center gap-3 px-3 py-2 text-sm',
                  active() === index() && 'overlay-hover'
                )}
                onMouseEnter={() => setActive(index())}
                onMouseDown={(e) => {
                  e.preventDefault();
                  open(instrument.symbol);
                }}
              >
                <span class="w-20 shrink-0 font-medium text-ink">
                  {instrument.symbol}
                </span>
                <span class="min-w-0 flex-1 truncate text-xs text-ink-muted">
                  {instrument.name} · {instrument.assetClass}
                </span>
                <span class="tabular-nums text-ink">
                  {formatPrice(instrument)}
                </span>
                <ChangeText
                  instrument={instrument}
                  class="w-16 text-right text-xs"
                />
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
