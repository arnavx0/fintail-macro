import { CHART_PALETTE } from '@app/features/database-query/core/chart-palette';
import { For, Show } from 'solid-js';
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPercent,
  formatWeight,
} from '../core/format';
import type { Contributor } from '../core/insights';
import type { Slice } from '../core/metrics';
import type { UpcomingDividend } from '../core/types';
import { changeClass } from './figures';

/** A one-line takeaway at the top of an answer. */
function Lead(props: { children: string }) {
  return (
    <p data-ask-row class="text-sm text-ink">
      {props.children}
    </p>
  );
}

/** "Why did I move today?": contributions as diverging bars around a zero line. */
export function ContributorsAnswer(props: {
  total: number;
  contributors: readonly Contributor[];
  currency: string;
}) {
  const top = () => props.contributors.slice(0, 6);
  const scale = () =>
    Math.max(1, ...top().map((c) => Math.abs(c.contribution)));
  const lead = () => {
    const first = top()[0];
    const direction = props.total >= 0 ? 'up' : 'down';
    return first
      ? `You're ${direction} ${formatSignedMoney(props.total, props.currency)} today. ${first.symbol} moved your portfolio the most (${formatSignedMoney(first.contribution, props.currency)}).`
      : 'Nothing in your portfolio has moved today.';
  };
  return (
    <>
      <Lead>{lead()}</Lead>
      <ul class="flex flex-col gap-1.5">
        <For each={top()}>
          {(c) => (
            <li
              data-ask-row
              class="grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-2 text-xs"
            >
              <span class="font-medium text-ink">{c.symbol}</span>
              <span class="relative h-2" aria-hidden="true">
                <span class="absolute inset-y-0 left-1/2 w-px bg-edge" />
                <span
                  class="absolute inset-y-0 rounded-[3px]"
                  style={{
                    width: `${(Math.abs(c.contribution) / scale()) * 50}%`,
                    left: c.contribution >= 0 ? '50%' : undefined,
                    right: c.contribution < 0 ? '50%' : undefined,
                    background:
                      c.contribution >= 0
                        ? 'var(--color-green)'
                        : 'var(--color-red)',
                  }}
                />
              </span>
              <span
                class={`text-right tabular-nums ${changeClass(c.contribution)}`}
              >
                {formatSignedMoney(c.contribution, props.currency)}
              </span>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}

/** "Am I diversified?": the mix as a bar, top positions and warnings. */
export function DiversificationAnswer(props: {
  assetClasses: readonly Slice[];
  /** Every asset class label, sorted, so colours match the Allocation card. */
  colorKeys: readonly string[];
  topPositions: readonly { symbol: string; weight: number }[];
  warnings: readonly string[];
}) {
  const color = (label: string) =>
    CHART_PALETTE[props.colorKeys.indexOf(label) % CHART_PALETTE.length];
  const lead = () =>
    props.warnings.length === 0
      ? 'No single holding or sector dominates your portfolio.'
      : `${props.warnings.length === 1 ? 'One area' : 'Two areas'} of concentration to be aware of.`;
  return (
    <>
      <Lead>{lead()}</Lead>
      <div
        data-ask-row
        class="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full"
      >
        <For each={props.assetClasses}>
          {(slice) => (
            <span
              class="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                'flex-grow': slice.weight,
                background: color(slice.label),
              }}
              title={`${slice.label} ${formatWeight(slice.weight)}`}
            />
          )}
        </For>
      </div>
      <ul
        data-ask-row
        class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted"
      >
        <For each={props.assetClasses}>
          {(slice) => (
            <li class="flex items-center gap-1.5">
              <span
                class="size-2 rounded-full"
                style={{ background: color(slice.label) }}
              />
              {slice.label}{' '}
              <span class="tabular-nums text-ink">
                {formatWeight(slice.weight)}
              </span>
            </li>
          )}
        </For>
      </ul>
      <p data-ask-row class="text-xs text-ink-muted">
        Largest positions:{' '}
        <span class="text-ink">
          {props.topPositions
            .map((p) => `${p.symbol} ${formatWeight(p.weight)}`)
            .join(' · ')}
        </span>
      </p>
      <For each={props.warnings}>
        {(warning) => (
          <p
            data-ask-row
            class="rounded-lg bg-red-bg px-2.5 py-1.5 text-xs text-ink"
          >
            <span class="text-red-ink" aria-hidden="true">
              ▲{' '}
            </span>
            {warning}
          </p>
        )}
      </For>
    </>
  );
}

/** "Me vs the S&P 500": returns and volatility side by side. */
export function BenchmarkAnswer(props: {
  rangeLabel: string;
  benchmarkName: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  difference: number;
  portfolioVolatility: number;
  benchmarkVolatility: number;
}) {
  const lead = () =>
    `Over the ${props.rangeLabel} your portfolio ${props.difference >= 0 ? 'beat' : 'trailed'} the ${props.benchmarkName} by ${formatSignedPercent(props.difference).replace(/^[+−]/, '')}, with ${props.portfolioVolatility > props.benchmarkVolatility ? 'more' : 'less'} volatility.`;
  const rows = () => [
    {
      label: 'Your return',
      value: props.portfolioReturn,
      vol: props.portfolioVolatility,
    },
    {
      label: props.benchmarkName,
      value: props.benchmarkReturn,
      vol: props.benchmarkVolatility,
    },
  ];
  return (
    <>
      <Lead>{lead()}</Lead>
      <dl class="grid grid-cols-3 gap-2 text-xs">
        <For each={rows()}>
          {(row) => (
            <>
              <dt data-ask-row class="text-ink-muted">
                {row.label}
              </dt>
              <dd
                data-ask-row
                class={`tabular-nums font-medium ${changeClass(row.value)}`}
              >
                {formatSignedPercent(row.value)}
              </dd>
              <dd data-ask-row class="tabular-nums text-ink-muted">
                {formatWeight(row.vol)} volatility
              </dd>
            </>
          )}
        </For>
      </dl>
    </>
  );
}

/** "My dividend income": received, expected and the next payments. */
export function IncomeAnswer(props: {
  currency: string;
  trailing: number;
  forward: number;
  forwardYield: number;
  upcoming: readonly UpcomingDividend[];
}) {
  const date = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <>
      <Lead>
        {`You received ${formatMoney(props.trailing, props.currency)} in dividends over the last 12 months and are on track for ${formatMoney(props.forward, props.currency)} next year (${formatWeight(props.forwardYield)} yield).`}
      </Lead>
      <Show when={props.upcoming.length > 0}>
        <ul class="flex flex-col divide-y divide-edge-muted text-xs">
          <For each={props.upcoming.slice(0, 4)}>
            {(d) => (
              <li data-ask-row class="flex items-center justify-between py-1.5">
                <span class="font-medium text-ink">{d.symbol}</span>
                <span class="text-ink-muted">{date(d.payDate)}</span>
                <span class="tabular-nums text-ink">
                  {formatMoney(d.amount, props.currency)}
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );
}
