import CheckIcon from '@phosphor/check.svg';
import MagnifyingGlassIcon from '@phosphor/magnifying-glass.svg';
import ShieldCheckIcon from '@phosphor/shield-check.svg';
import XIcon from '@phosphor/x.svg';
import { Button, cn, Dialog, Surface, ToggleSwitch } from '@ui';
import { createMemo, createSignal, For, Show } from 'solid-js';
import {
  BROKERAGES,
  type ConnectionState,
  SERVICES,
  type Service,
  serviceEnabled,
} from '../core/catalogue';
import { PlatformBadge } from './platform-badge';

const CONNECT_MS = 900;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Ease a newly shown block in: opacity and transform only. */
function revealIn(el: HTMLElement) {
  if (prefersReducedMotion()) return;
  el.animate(
    [
      { opacity: 0, transform: 'translateY(-6px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  );
}

/**
 * Where the user's money comes from: brokerage and crypto accounts through
 * the SnapTrade MCP connector, plus document connectors (contract notes,
 * exports). Market data lives in Markets' Data sources. All read-only.
 */
export function AccountsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ConnectionState;
  onSnaptrade: (on: boolean) => void;
  onToggleBroker: (id: string) => void;
  onService: (id: string, on: boolean) => void;
  onManageInSettings: () => void;
}) {
  const [filter, setFilter] = createSignal('');
  const [connecting, setConnecting] = createSignal<string>();
  const brokerages = createMemo(() => {
    const q = filter().trim().toLowerCase();
    return BROKERAGES.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.region.toLowerCase().includes(q)
    );
  });
  const connect = (id: string) => {
    if (props.state.brokers.includes(id)) {
      props.onToggleBroker(id);
      return;
    }
    setConnecting(id);
    setTimeout(() => {
      props.onToggleBroker(id);
      setConnecting(undefined);
    }, CONNECT_MS);
  };
  const groups = () =>
    (['Market data & research', 'Documents & exports'] as const).map(
      (group) => ({
        group,
        services: SERVICES.filter((s) => s.group === group),
      })
    );

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} class="w-2xl">
      <Surface depth={2} class="rounded-xl">
        <div class="flex max-h-[85vh] flex-col text-ink">
          <header class="flex items-start gap-3 border-b border-edge-muted p-4">
            <div class="min-w-0 flex-1">
              <Dialog.Title as="h2" class="m-0 p-0 text-base font-semibold">
                Accounts
              </Dialog.Title>
              <p class="text-xs text-ink-muted">
                Connect the accounts that hold your money. Fintail and its AI
                read them to build your portfolio.
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

          <div class="flex flex-col gap-5 overflow-y-auto p-4">
            <section
              aria-label="Brokerage and crypto accounts"
              class="flex flex-col gap-3"
            >
              <div class="flex items-center gap-3 rounded-xl border border-edge-muted bg-panel p-3">
                <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-bg text-xs font-semibold text-accent-ink">
                  ST
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">
                      Brokerage & crypto accounts
                    </span>
                    <span class="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] text-ink-muted">
                      SnapTrade MCP
                    </span>
                  </div>
                  <p class="text-xs text-ink-muted">
                    Holdings, balances and activity from 15+ platforms,
                    read-only.
                  </p>
                </div>
                <ToggleSwitch
                  size="md"
                  checked={props.state.snaptrade}
                  onChange={props.onSnaptrade}
                  label={
                    <span class="sr-only">Enable brokerage connector</span>
                  }
                />
              </div>

              <Show when={props.state.snaptrade}>
                <div ref={revealIn} class="flex flex-col gap-2">
                  <label class="flex h-9 items-center gap-2 rounded-lg border border-edge-muted bg-input px-3 focus-within:border-accent">
                    <MagnifyingGlassIcon class="size-4 text-ink-muted" />
                    <span class="sr-only">Find a brokerage</span>
                    <input
                      type="search"
                      autocomplete="off"
                      placeholder="Find a brokerage or exchange"
                      class="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-placeholder"
                      value={filter()}
                      onInput={(e) => setFilter(e.currentTarget.value)}
                    />
                  </label>
                  <ul class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <For each={brokerages()}>
                      {(b) => {
                        const connected = () =>
                          props.state.brokers.includes(b.id);
                        const busy = () => connecting() === b.id;
                        return (
                          <li class="flex items-center gap-2.5 rounded-lg border border-edge-muted px-2.5 py-2">
                            <PlatformBadge
                              platform={{
                                id: b.id,
                                name: b.name,
                                kind: b.kind,
                              }}
                              class="size-7 text-[10px]"
                            />
                            <div class="min-w-0 flex-1">
                              <div class="truncate text-sm">{b.name}</div>
                              <div class="text-[11px] text-ink-muted">
                                {b.kind === 'crypto' ? 'Crypto' : 'Brokerage'} ·{' '}
                                {b.region}
                              </div>
                            </div>
                            <Button
                              variant={connected() ? 'success' : 'outline'}
                              size="sm"
                              disabled={busy()}
                              aria-pressed={connected()}
                              class={cn(
                                'min-w-24 gap-1',
                                busy() && 'animate-pulse'
                              )}
                              onClick={() => connect(b.id)}
                            >
                              <Show when={connected()}>
                                <CheckIcon class="size-3.5" />
                              </Show>
                              {busy()
                                ? 'Connecting…'
                                : connected()
                                  ? 'Connected'
                                  : 'Connect'}
                            </Button>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </div>
              </Show>
            </section>

            <For each={groups()}>
              {({ group, services }) => (
                <section aria-label={group} class="flex flex-col gap-2">
                  <h3 class="text-xs font-medium text-ink-muted">{group}</h3>
                  <ul class="flex flex-col divide-y divide-edge-muted rounded-xl border border-edge-muted">
                    <For each={services}>
                      {(service: Service) => (
                        <li class="flex items-center gap-3 px-3 py-2.5">
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <span class="text-sm">{service.name}</span>
                              <span class="text-[10px] text-ink-muted">
                                {service.via}
                              </span>
                            </div>
                            <p class="text-xs text-ink-muted">
                              {service.description}
                            </p>
                          </div>
                          <ToggleSwitch
                            size="md"
                            checked={serviceEnabled(props.state, service)}
                            onChange={(on) => props.onService(service.id, on)}
                            label={
                              <span class="sr-only">Enable {service.name}</span>
                            }
                          />
                        </li>
                      )}
                    </For>
                  </ul>
                </section>
              )}
            </For>
          </div>

          <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-edge-muted px-4 py-3">
            <p class="flex items-center gap-1.5 text-xs text-ink-muted">
              <ShieldCheckIcon class="size-4 text-green-ink" />
              Read-only. Fintail never places trades or moves money.
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
