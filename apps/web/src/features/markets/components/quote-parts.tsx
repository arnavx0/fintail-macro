import { AnimatedNumber } from '@core/component/AnimatedNumber';
import { cn } from '@ui';
import { createMemo, For, type JSX, onCleanup, onMount } from 'solid-js';
import { formatChange, formatPrice } from '../core/format';
import { change } from '../core/market-metrics';
import type { Instrument, PricePoint } from '../core/types';

/** Gain/loss ink; the sign always carries the meaning too. */
export function changeInk(amount: number) {
  if (amount > 0) return 'text-green-ink';
  if (amount < 0) return 'text-red-ink';
  return 'text-ink-muted';
}

/** A titled card on the Markets page. */
export function Panel(props: {
  title: string;
  action?: JSX.Element;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <section
      aria-label={props.title}
      class={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border border-edge-muted bg-panel p-4',
        props.class
      )}
    >
      <header class="flex min-h-6 items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-ink">{props.title}</h2>
        {props.action}
      </header>
      {props.children}
    </section>
  );
}

/** Today's change for an instrument, in gain/loss ink. */
export function ChangeText(props: { instrument: Instrument; class?: string }) {
  const c = () => change(props.instrument);
  return (
    <span class={cn('tabular-nums', changeInk(c().amount), props.class)}>
      {formatChange(props.instrument, c().amount, c().share)}
    </span>
  );
}

/** An animated price that counts to its new value. */
export function Price(props: { instrument: Instrument; class?: string }) {
  return (
    <AnimatedNumber
      value={props.instrument.price}
      format={(v) => formatPrice(props.instrument, v)}
      class={props.class}
    />
  );
}

/**
 * A tiny trend line drawn as an SVG path, coloured by the direction of the
 * whole series. Decorative: the price and change beside it carry the data.
 */
export function Sparkline(props: {
  points: readonly PricePoint[];
  class?: string;
}) {
  const path = createMemo(() => {
    const prices = props.points.map((p) => p.price);
    if (prices.length < 2) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    return prices
      .map((price, i) => {
        const x = (i / (prices.length - 1)) * 100;
        const y = 28 - ((price - min) / span) * 26;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  });
  const up = () =>
    (props.points.at(-1)?.price ?? 0) >= (props.points[0]?.price ?? 0);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      class={cn('h-8 w-full overflow-visible', props.class)}
    >
      <path
        d={path()}
        fill="none"
        stroke={up() ? 'var(--color-green)' : 'var(--color-red)'}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A compact quote card: name, price, change and a one-month sparkline. */
export function QuoteCard(props: {
  instrument: Instrument;
  points: readonly PricePoint[];
  onOpen: (symbol: string) => void;
}) {
  return (
    <button
      type="button"
      class="group flex min-w-0 flex-col gap-1.5 rounded-xl border border-edge-muted bg-panel p-3 text-left outline-none transition-[transform,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-edge-focus not-touch:hover:-translate-y-0.5 not-touch:hover:border-edge motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      onClick={() => props.onOpen(props.instrument.symbol)}
    >
      <div class="flex items-baseline justify-between gap-2">
        <span class="truncate text-xs text-ink-muted">
          {props.instrument.name}
        </span>
        <ChangeText instrument={props.instrument} class="text-xs" />
      </div>
      <Price
        instrument={props.instrument}
        class="text-base font-semibold text-ink"
      />
      <Sparkline points={props.points} />
    </button>
  );
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * A slowly scrolling strip of headline quotes. Pauses on hover and focus;
 * under reduced motion it is a static row that scrolls by hand.
 */
export function TickerStrip(props: {
  instruments: readonly Instrument[];
  onOpen: (symbol: string) => void;
}) {
  let track: HTMLDivElement | undefined;
  let animation: Animation | undefined;
  onMount(() => {
    if (!track || prefersReducedMotion()) return;
    // The list is rendered twice, so sliding by half loops seamlessly.
    animation = track.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
      { duration: props.instruments.length * 4000, iterations: Infinity }
    );
  });
  onCleanup(() => animation?.cancel());
  const items = () =>
    prefersReducedMotion()
      ? props.instruments
      : [...props.instruments, ...props.instruments];
  return (
    <div
      role="region"
      aria-label="Market snapshot"
      class="-mx-4 overflow-x-auto border-y border-edge-muted bg-panel/60 [scrollbar-width:none] sm:mx-0 sm:rounded-xl sm:border"
      onMouseEnter={() => animation?.pause()}
      onMouseLeave={() => animation?.play()}
      onFocusIn={() => animation?.pause()}
      onFocusOut={() => animation?.play()}
    >
      <div ref={track} class="flex w-max">
        <For each={items()}>
          {(instrument, index) => (
            <button
              type="button"
              tabIndex={index() >= props.instruments.length ? -1 : 0}
              aria-hidden={
                index() >= props.instruments.length ? 'true' : undefined
              }
              class="flex shrink-0 items-baseline gap-2 px-4 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edge-focus"
              onClick={() => props.onOpen(instrument.symbol)}
            >
              <span class="font-medium text-ink">{instrument.name}</span>
              <span class="tabular-nums text-ink-muted">
                {formatPrice(instrument)}
              </span>
              <ChangeText instrument={instrument} />
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
