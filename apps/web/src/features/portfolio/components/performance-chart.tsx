import { CHART_TIP } from '@app/features/database-query/core/query-chart-plot';
import { createElementSize } from '@solid-primitives/resize-observer';
import { SegmentedControl } from '@ui';
import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { formatMoney, formatSignedPercent } from '../core/format';
import type { RangeId } from '../core/types';
import { Section } from './figures';

type PlotModule = typeof import('@observablehq/plot');
let plotModule: Promise<PlotModule> | undefined;
const loadPlot = () => {
  plotModule ??= import('@observablehq/plot');
  return plotModule;
};

export type ChartPoint = {
  date: Date;
  value: number;
  portfolio: number;
  benchmark: number;
};

const HEIGHT = 220;
const PORTFOLIO = 'var(--color-blue)';
const BENCHMARK = 'var(--color-ink-subtle)';

const dayFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * "Am I beating just buying the index?" Portfolio growth against the
 * benchmark over the selected range, both flow-neutral (time-weighted) so
 * deposits never look like gains.
 */
export function PerformanceChart(props: {
  motionKey?: string;
  points: readonly ChartPoint[];
  currency: string;
  benchmarkName: string;
  range: RangeId;
  ranges: readonly RangeId[];
  onRange: (range: RangeId) => void;
}) {
  const [plot, setPlot] = createSignal<PlotModule>();
  const [failed, setFailed] = createSignal(false);
  const [frame, setFrame] = createSignal<HTMLDivElement>();
  const size = createElementSize(frame);
  let container: HTMLDivElement | undefined;

  onMount(() => {
    void (async () => {
      try {
        setPlot(await loadPlot());
      } catch {
        setFailed(true);
      }
    })();
  });

  // Imperative sync with Plot's returned element; nothing is derived here.
  createEffect(
    on(
      [plot, () => props.points, () => size.width],
      ([Plot, points, width]) => {
        if (!Plot || !container || !width || points.length === 0) return;
        const tip = (d: ChartPoint) =>
          [
            dayFormat.format(d.date),
            `Portfolio  ${formatSignedPercent(d.portfolio)}`,
            `${props.benchmarkName}  ${formatSignedPercent(d.benchmark)}`,
            `Value  ${formatMoney(d.value, props.currency)}`,
          ].join('\n');
        const last = points.at(-1)!;
        const element = Plot.plot({
          width,
          height: HEIGHT,
          marginLeft: 44,
          marginRight: 12,
          style: { background: 'transparent', color: 'var(--color-ink-muted)' },
          x: { type: 'utc', ticks: 5, label: null },
          y: {
            grid: true,
            label: null,
            ticks: 5,
            tickFormat: (v: number) =>
              formatSignedPercent(v).replace(/\.00%$/, '%'),
          },
          marks: [
            Plot.gridY({ stroke: 'var(--color-edge-muted)', strokeOpacity: 1 }),
            Plot.ruleY([0], { stroke: 'var(--color-edge)' }),
            Plot.areaY(points, {
              x: 'date',
              y: 'portfolio',
              fill: PORTFOLIO,
              fillOpacity: 0.1,
              curve: 'monotone-x',
            }),
            Plot.lineY(points, {
              x: 'date',
              y: 'benchmark',
              stroke: BENCHMARK,
              strokeWidth: 1.5,
              curve: 'monotone-x',
            }),
            Plot.lineY(points, {
              x: 'date',
              y: 'portfolio',
              stroke: PORTFOLIO,
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              curve: 'monotone-x',
            }),
            Plot.dot([last], {
              x: 'date',
              y: 'portfolio',
              r: 4,
              fill: PORTFOLIO,
              stroke: 'var(--color-panel)',
              strokeWidth: 2,
            }),
            Plot.ruleX(
              points,
              Plot.pointerX({ x: 'date', stroke: 'var(--color-edge)' })
            ),
            Plot.dot(
              points,
              Plot.pointerX({
                x: 'date',
                y: 'portfolio',
                r: 4,
                fill: PORTFOLIO,
                stroke: 'var(--color-panel)',
                strokeWidth: 2,
              })
            ),
            Plot.tip(
              points,
              Plot.pointerX({
                x: 'date',
                y: 'portfolio',
                title: tip,
                ...CHART_TIP,
              })
            ),
          ],
        });
        container.replaceChildren(element);
        onCleanup(() => element.remove());
      }
    )
  );

  return (
    <Section
      title="Performance"
      motionKey={props.motionKey}
      action={
        <SegmentedControl
          size="sm"
          aria-label="Time range"
          value={props.range}
          options={props.ranges.map((r) => ({ value: r, label: r }))}
          onChange={props.onRange}
        />
      }
    >
      <div class="flex items-center gap-4 text-xs text-ink-muted">
        <span class="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            class="h-0.5 w-3 rounded-full"
            style={{ background: PORTFOLIO }}
          />
          Your portfolio
        </span>
        <span class="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            class="h-0.5 w-3 rounded-full"
            style={{ background: BENCHMARK }}
          />
          {props.benchmarkName}
        </span>
      </div>
      <div
        ref={setFrame}
        role="img"
        aria-label={`Portfolio return against the ${props.benchmarkName}`}
        aria-busy={!plot() && !failed()}
        class="min-w-0"
        style={{ height: `${HEIGHT}px` }}
      >
        <div ref={container} class="[&_[aria-label=tip]]:text-ink" />
        <Show when={failed()}>
          <p class="py-6 text-center text-xs text-ink-muted">
            The chart could not load.
          </p>
        </Show>
      </div>
    </Section>
  );
}
