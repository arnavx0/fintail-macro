import { AnimatedNumber } from '@core/component/AnimatedNumber';
import { For, Show } from 'solid-js';
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPercent,
  formatWeight,
} from '../core/format';
import type { UpcomingDividend } from '../core/types';
import { changeClass, Figure, Section } from './figures';

/** "Am I actually making money, and from what?" */
export function ReturnCard(props: {
  motionKey?: string;
  currency: string;
  rangeLabel: string;
  moneyWeighted: number;
  timeWeighted: number;
  benchmark: number;
  benchmarkName: string;
  gain: number;
  deposits: number;
  unrealized: number;
  unrealizedPct: number;
}) {
  const beat = () => props.timeWeighted - props.benchmark;
  return (
    <Section
      title={`Returns · ${props.rangeLabel}`}
      motionKey={props.motionKey}
    >
      <div class="flex items-baseline gap-2">
        <span
          class={`text-2xl font-semibold ${changeClass(props.moneyWeighted)}`}
        >
          <AnimatedNumber
            value={props.moneyWeighted}
            format={formatSignedPercent}
          />
        </span>
        <span class="text-xs text-ink-muted">your return</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <Figure
          label="Investment gain"
          hint="Change in value after removing deposits and withdrawals"
        >
          <span class={changeClass(props.gain)}>
            <AnimatedNumber
              value={props.gain}
              format={(v) => formatSignedMoney(v, props.currency)}
            />
          </span>
        </Figure>
        <Figure label="Net deposits">
          {formatSignedMoney(props.deposits, props.currency)}
        </Figure>
        <Figure
          label={`vs ${props.benchmarkName}`}
          hint="Time-weighted return minus the index return over the same range"
        >
          <span class={changeClass(beat())}>{formatSignedPercent(beat())}</span>
        </Figure>
        <Figure label="Unrealised P/L" hint="Today's value minus what you paid">
          <span class={changeClass(props.unrealized)}>
            {formatSignedPercent(props.unrealizedPct)}
          </span>
        </Figure>
      </div>
    </Section>
  );
}

/** "How exposed am I?" */
export function RiskCard(props: {
  motionKey?: string;
  volatility: number;
  maxDrawdown: number;
  largestWeight: number;
  warnings: readonly string[];
}) {
  return (
    <Section title="Risk" motionKey={props.motionKey}>
      <div class="grid grid-cols-3 gap-3">
        <Figure
          label="Volatility"
          hint="Annualised standard deviation of daily returns"
        >
          <AnimatedNumber value={props.volatility} format={formatWeight} />
        </Figure>
        <Figure
          label="Max drawdown"
          hint="Largest fall from a peak in this range"
        >
          <span class="text-red-ink">
            <AnimatedNumber
              value={props.maxDrawdown}
              format={formatSignedPercent}
            />
          </span>
        </Figure>
        <Figure label="Largest position">
          {formatWeight(props.largestWeight)}
        </Figure>
      </div>
      <Show
        when={props.warnings.length > 0}
        fallback={
          <p class="text-xs text-ink-muted">
            No single holding or sector dominates.
          </p>
        }
      >
        <ul class="flex flex-col gap-1.5">
          <For each={props.warnings}>
            {(warning) => (
              <li class="flex items-start gap-2 rounded-lg bg-red-bg px-2.5 py-1.5 text-xs text-ink">
                <span aria-hidden="true" class="text-red-ink">
                  ▲
                </span>
                <span>
                  <span class="sr-only">Concentration: </span>
                  {warning}
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </Section>
  );
}

/** "What does my portfolio pay me?" */
export function IncomeCard(props: {
  motionKey?: string;
  currency: string;
  trailing: number;
  forward: number;
  forwardYield: number;
  upcoming: readonly UpcomingDividend[];
}) {
  const shortDate = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <Section title="Income" motionKey={props.motionKey}>
      <div class="grid grid-cols-3 gap-3">
        <Figure label="Last 12 months">
          {formatMoney(props.trailing, props.currency)}
        </Figure>
        <Figure label="Next 12 months" hint="Forecast from announced dividends">
          <AnimatedNumber
            value={props.forward}
            format={(v) => formatMoney(v, props.currency)}
          />
        </Figure>
        <Figure label="Yield">{formatWeight(props.forwardYield)}</Figure>
      </div>
      <Show when={props.upcoming.length > 0}>
        <ul class="flex flex-col divide-y divide-edge-muted">
          <For each={props.upcoming.slice(0, 4)}>
            {(dividend) => (
              <li class="flex items-center justify-between py-1.5 text-xs">
                <span class="font-medium text-ink">{dividend.symbol}</span>
                <span class="text-ink-muted">
                  {shortDate(dividend.payDate)}
                </span>
                <span class="tabular-nums text-ink">
                  {formatMoney(dividend.amount, props.currency)}
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </Section>
  );
}
