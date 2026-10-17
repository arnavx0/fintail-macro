import { Button, cn } from '@ui';
import { For } from 'solid-js';
import type { Platform } from '../core/types';
import { PlatformBadge } from './platform-badge';

/**
 * One row of pill toggles: "All" plus a pill per connected platform. Every
 * figure on the page follows this filter. On phones the row scrolls sideways.
 */
export function PlatformPills(props: {
  platforms: readonly Platform[];
  selected: ReadonlySet<string>;
  onToggle: (platformId: string) => void;
  onClear: () => void;
}) {
  const all = () => props.selected.size === 0;
  return (
    <div
      role="group"
      aria-label="Filter by platform"
      class="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]"
    >
      <Button
        variant="outline"
        size="sm"
        aria-pressed={all()}
        class={cn(
          'shrink-0 transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none',
          all() && 'text-ink ring-1 ring-edge'
        )}
        onClick={props.onClear}
      >
        All accounts
      </Button>
      <For each={props.platforms}>
        {(platform) => {
          const active = () => props.selected.has(platform.id);
          return (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={active()}
              class={cn(
                'group shrink-0 gap-1.5 pl-1 transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none',
                active() && 'text-ink ring-1 ring-edge'
              )}
              onClick={() => props.onToggle(platform.id)}
            >
              <PlatformBadge
                platform={platform}
                class={cn(
                  'transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none',
                  'not-touch:group-hover:-rotate-6 not-touch:group-hover:scale-110',
                  active() ? 'scale-110' : 'scale-100'
                )}
              />
              {platform.name}
            </Button>
          );
        }}
      </For>
    </div>
  );
}
