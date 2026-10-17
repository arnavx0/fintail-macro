import { CHART_TIP } from '@app/features/database-query/core/query-chart-plot';
import { createElementSize } from '@solid-primitives/resize-observer';
import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { formatPrice } from '../core/format';
import type { ChartRange, Instrument, PricePoint } from '../core/types';

type PlotModule = typeof import('@observablehq/plot');
let plotModule: Promise<PlotModule> | undefined;
const loadPlot = () => {
  plotModule ??= import('@observablehq/plot');
  return plotModule;
};

const HEIGHT = 200;

/**
 * An instrument's price over the selected range, green when the range is up
 * and red when it is down, with a crosshair and tooltip.
 */
export function PriceChart(props: {
  instrument: Instrument;
  points: readonly PricePoint[];
  range: ChartRange;
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
        if (!Plot || !container || !width || points.length < 2) return;
        const data = points.map((p) => ({
          time: new Date(p.time),
          price: p.price,
        }));
        const up = data.at(-1)!.price >= data[0].price;
        const color = up ? 'var(--color-green)' : 'var(--color-red)';
        const timeFormat = new Intl.DateTimeFormat(
          undefined,
          props.range === '1D'
            ? { hour: 'numeric', minute: '2-digit' }
            : {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC',
              }
        );
        const element = Plot.plot({
          width,
          height: HEIGHT,
          marginLeft: 56,
          marginRight: 8,
          style: { background: 'transparent', color: 'var(--color-ink-muted)' },
          x: { type: 'utc', ticks: 4, label: null },
          y: {
            grid: true,
            label: null,
            ticks: 4,
            nice: true,
            tickFormat: (v: number) => formatPrice(props.instrument, v),
          },
          marks: [
            Plot.gridY({ stroke: 'var(--color-edge-muted)', strokeOpacity: 1 }),
            Plot.areaY(data, {
              x: 'time',
              y1: Math.min(...data.map((d) => d.price)),
              y2: 'price',
              fill: color,
              fillOpacity: 0.1,
            }),
            Plot.lineY(data, {
              x: 'time',
              y: 'price',
              stroke: color,
              strokeWidth: 2,
              strokeLinejoin: 'round',
              strokeLinecap: 'round',
            }),
            Plot.ruleX(
              data,
              Plot.pointerX({ x: 'time', stroke: 'var(--color-edge)' })
            ),
            Plot.dot(
              data,
              Plot.pointerX({
                x: 'time',
                y: 'price',
                r: 4,
                fill: color,
                stroke: 'var(--color-panel)',
                strokeWidth: 2,
              })
            ),
            Plot.tip(
              data,
              Plot.pointerX({
                x: 'time',
                y: 'price',
                title: (d: { time: Date; price: number }) =>
                  `${timeFormat.format(d.time)}\n${formatPrice(props.instrument, d.price)}`,
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
    <div
      ref={setFrame}
      role="img"
      aria-label={`${props.instrument.name} price, ${props.range}`}
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
  );
}
