import { CHART_PALETTE } from '@app/features/database-query/core/chart-palette';
import { SegmentedControl } from '@ui';
import { For } from 'solid-js';
import { formatMoney, formatWeight } from '../core/format';
import type { Slice } from '../core/metrics';
import { Section } from './figures';

/**
 * "Am I diversified?" A single stacked bar and a legend. Colours come from
 * `colorKeys`, the stable list of every label for this lens, so filtering
 * never repaints a slice.
 */
export function AllocationCard<Lens extends string>(props: {
  motionKey?: string;
  slices: readonly Slice[];
  colorKeys: readonly string[];
  currency: string;
  lens: Lens;
  lenses: readonly Lens[];
  onLens: (lens: Lens) => void;
}) {
  const color = (label: string) => {
    if (label === 'Other') return 'var(--color-ink-subtle)';
    const index = props.colorKeys.indexOf(label);
    return CHART_PALETTE[index % CHART_PALETTE.length];
  };
  return (
    <Section
      title="Allocation"
      motionKey={props.motionKey}
      action={
        <SegmentedControl
          size="sm"
          aria-label="Allocation by"
          value={props.lens}
          options={props.lenses.map((lens) => ({ value: lens, label: lens }))}
          onChange={props.onLens}
        />
      }
    >
      <div
        role="img"
        aria-label={props.slices
          .map((s) => `${s.label} ${formatWeight(s.weight)}`)
          .join(', ')}
        class="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
      >
        <For each={props.slices}>
          {(slice) => (
            <span
              class="h-full transition-[flex-grow] duration-500 ease-out first:rounded-l-full last:rounded-r-full motion-reduce:transition-none"
              style={{
                'flex-grow': slice.weight,
                background: color(slice.label),
              }}
            />
          )}
        </For>
      </div>
      <ul class="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <For each={props.slices}>
          {(slice) => (
            <li class="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                class="size-2 shrink-0 rounded-full"
                style={{ background: color(slice.label) }}
              />
              <span class="min-w-0 flex-1 truncate text-ink">
                {slice.label}
              </span>
              <span class="tabular-nums text-ink-muted">
                {formatMoney(slice.value, props.currency)}
              </span>
              <span class="w-12 text-right tabular-nums font-medium text-ink">
                {formatWeight(slice.weight)}
              </span>
            </li>
          )}
        </For>
      </ul>
    </Section>
  );
}
