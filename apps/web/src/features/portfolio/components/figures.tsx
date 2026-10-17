import { cn } from '@ui';
import type { JSX } from 'solid-js';
import {
  direction,
  formatSignedMoney,
  formatSignedPercent,
} from '../core/format';

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
    <span class={cn(changeClass(props.amount), props.class)}>
      {formatSignedMoney(props.amount, props.currency)} (
      {formatSignedPercent(props.share)})
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
