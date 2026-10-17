import { AnimatedNumber } from '@core/component/AnimatedNumber';
import { cn } from '@ui';
import { createSignal, type JSX } from 'solid-js';
import {
  direction,
  formatSignedMoney,
  formatSignedPercent,
} from '../core/format';
import { createEaseInOnChange } from './ease-in-on-change';

/** Gain/loss ink: green up, red down, muted when flat. The sign always carries the meaning too. */
export function changeClass(value: number) {
  const d = direction(value);
  if (d === 'up') return 'text-green-ink';
  if (d === 'down') return 'text-red-ink';
  return 'text-ink-muted';
}

/** `+S$120.40 (+1.20%)` in gain/loss ink. */
export function Change(props: {
  amount: number;
  share: number;
  currency: string;
  class?: string;
}) {
  return (
    <span
      class={cn(
        'transition-colors duration-300 motion-reduce:transition-none',
        changeClass(props.amount),
        props.class
      )}
    >
      <AnimatedNumber
        value={props.amount}
        format={(v) => formatSignedMoney(v, props.currency)}
      />{' '}
      (
      <AnimatedNumber value={props.share} format={formatSignedPercent} />)
    </span>
  );
}

/** A labelled figure inside a card: label above, value below. */
export function Figure(props: {
  label: string;
  hint?: string;
  children: JSX.Element;
}) {
  return (
    <div class="flex min-w-0 flex-col gap-0.5">
      <span class="text-xs text-ink-muted" title={props.hint}>
        {props.label}
      </span>
      <span class="truncate text-sm font-medium text-ink">
        {props.children}
      </span>
    </div>
  );
}

/** A titled section card used across the Portfolio page. */
export function Section(props: {
  title: string;
  action?: JSX.Element;
  class?: string;
  /** When this changes (a filter or range), the body eases in again. */
  motionKey?: string;
  children: JSX.Element;
}) {
  const [body, setBody] = createSignal<HTMLDivElement>();
  createEaseInOnChange(body, () => props.motionKey);
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
      <div ref={setBody} class="flex min-w-0 flex-col gap-3">
        {props.children}
      </div>
    </section>
  );
}
