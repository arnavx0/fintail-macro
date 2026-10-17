import { cn } from '@ui';
import { type Component, type JSX, Match, Switch } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import BinanceLogo from '../assets/binance.svg';
import CoinbaseLogo from '../assets/coinbase.svg';
import RobinhoodLogo from '../assets/robinhood.svg';
import type { Platform } from '../core/types';

type Brand = {
  /** Official brand colour (Simple Icons, CC0), the badge background. */
  background: string;
  /** Logo colour that reads on that background. */
  foreground: string;
  logo?: Component<JSX.SvgSVGAttributes<SVGSVGElement>>;
  /** Shown when no official logo is bundled; never an imitation of one. */
  monogram: string;
};

/**
 * Logos bundled for the sample portfolio. Connected platforms bring their
 * official logo URL from the data source instead (SnapTrade).
 */
const BRANDS: Record<string, Brand> = {
  robinhood: {
    background: '#CCFF00',
    foreground: '#111111',
    logo: RobinhoodLogo,
    monogram: 'RH',
  },
  coinbase: {
    background: '#0052FF',
    foreground: '#FFFFFF',
    logo: CoinbaseLogo,
    monogram: 'CB',
  },
  binance: {
    background: '#F0B90B',
    foreground: '#181A20',
    logo: BinanceLogo,
    monogram: 'BN',
  },
  ibkr: { background: '#D81222', foreground: '#FFFFFF', monogram: 'IB' },
};

const monogramOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

/** A platform's logo in a small brand-coloured circle. */
export function PlatformBadge(props: { platform: Platform; class?: string }) {
  const brand = () => BRANDS[props.platform.id];
  return (
    <span
      aria-hidden="true"
      class={cn(
        'inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[9px] font-semibold text-ink ring-1 ring-edge-muted',
        props.class
      )}
      style={
        brand()
          ? { background: brand()!.background, color: brand()!.foreground }
          : undefined
      }
    >
      <Switch fallback={monogramOf(props.platform.name)}>
        <Match when={props.platform.logoUrl}>
          {(url) => <img src={url()} alt="" class="size-full object-cover" />}
        </Match>
        <Match when={brand()?.logo}>
          {(logo) => <Dynamic component={logo()} class="size-3" />}
        </Match>
        <Match when={brand()}>{(b) => b().monogram}</Match>
      </Switch>
    </span>
  );
}
