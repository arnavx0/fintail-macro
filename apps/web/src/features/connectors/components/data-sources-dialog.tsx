import BankIcon from '@phosphor/bank.svg';
import ChartLineUpIcon from '@phosphor/chart-line-up.svg';
import FileTextIcon from '@phosphor/file-text.svg';
import NewspaperIcon from '@phosphor/newspaper.svg';
import ShieldCheckIcon from '@phosphor/shield-check.svg';
import XIcon from '@phosphor/x.svg';
import { Button, cn, Dialog, Surface, ToggleSwitch } from '@ui';
import { type Component, For, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  type ConnectionState,
  SERVICES,
  type Service,
  serviceEnabled,
} from '../core/catalogue';

const ICONS: Record<string, Component<JSX.SvgSVGAttributes<SVGSVGElement>>> = {
  'market-data': ChartLineUpIcon,
  edgar: FileTextIcon,
  fred: BankIcon,
  news: NewspaperIcon,
};

/**
 * Where market information comes from: prices, filings, economic data and
 * news. Separate from Portfolio's Accounts, which hold the user's money.
 */
export function DataSourcesDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ConnectionState;
  onService: (id: string, on: boolean) => void;
  onManageInSettings: () => void;
}) {
  const sources = () =>
    SERVICES.filter((s) => s.group === 'Market data & research');
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} class="w-2xl">
      <Surface depth={2} class="rounded-xl">
        <div class="flex max-h-[85vh] flex-col text-ink">
          <header class="flex items-start gap-3 border-b border-edge-muted p-4">
            <div class="min-w-0 flex-1">
              <Dialog.Title as="h2" class="m-0 p-0 text-base font-semibold">
                Data sources
              </Dialog.Title>
              <p class="text-xs text-ink-muted">
                Market information Fintail and its AI draw on: prices, filings,
                economic data and news.
              </p>
            </div>
            <Dialog.CloseButton
              as={Button}
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
            >
              <XIcon />
            </Dialog.CloseButton>
          </header>
          <ul class="grid grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
            <For each={sources()}>
              {(source: Service) => {
                const on = () => serviceEnabled(props.state, source);
                return (
                  <li
                    class={cn(
                      'flex flex-col gap-3 rounded-xl border bg-panel p-3 transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none',
                      on()
                        ? 'border-accent/40 shadow-[0_0_0_3px_var(--color-accent-bg)]'
                        : 'border-edge-muted'
                    )}
                  >
                    <div class="flex items-start gap-3">
                      <span
                        class={cn(
                          'inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 motion-reduce:transition-none',
                          on()
                            ? 'bg-accent-bg text-accent-ink'
                            : 'bg-surface-3 text-ink-muted'
                        )}
                      >
                        <Dynamic
                          component={ICONS[source.id] ?? ChartLineUpIcon}
                          class="size-5"
                        />
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium">{source.name}</div>
                        <div class="text-[10px] text-ink-muted">
                          {source.via}
                        </div>
                      </div>
                      <ToggleSwitch
                        size="md"
                        checked={on()}
                        onChange={(value) => props.onService(source.id, value)}
                        label={
                          <span class="sr-only">Enable {source.name}</span>
                        }
                      />
                    </div>
                    <p class="text-xs text-ink-muted">{source.description}</p>
                  </li>
                );
              }}
            </For>
          </ul>
          <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-edge-muted px-4 py-3">
            <p class="flex items-center gap-1.5 text-xs text-ink-muted">
              <ShieldCheckIcon class="size-4 text-green-ink" />
              Licensed data only. Information, not advice.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onManageInSettings}
            >
              Advanced MCP settings
            </Button>
          </footer>
        </div>
      </Surface>
    </Dialog>
  );
}
