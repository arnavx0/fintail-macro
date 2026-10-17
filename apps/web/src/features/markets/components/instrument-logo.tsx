import { cn } from '@ui';
import type { Component, JSX } from 'solid-js';
import { Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import LogoAAPL from '../assets/logos/aapl.svg';
import LogoADA from '../assets/logos/ada.svg';
import LogoADBE from '../assets/logos/adbe.svg';
import LogoAMD from '../assets/logos/amd.svg';
import LogoAMZN from '../assets/logos/amzn.svg';
import LogoAVGO from '../assets/logos/avgo.svg';
import LogoBA from '../assets/logos/ba.svg';
import LogoBAC from '../assets/logos/bac.svg';
import LogoBNB from '../assets/logos/bnb.svg';
import LogoBTC from '../assets/logos/btc.svg';
import LogoCAT from '../assets/logos/cat.svg';
import LogoCRM from '../assets/logos/crm.svg';
import LogoDOGE from '../assets/logos/doge.svg';
import LogoETH from '../assets/logos/eth.svg';
import LogoGE from '../assets/logos/ge.svg';
import LogoGOOGL from '../assets/logos/googl.svg';
import LogoGS from '../assets/logos/gs.svg';
import LogoMCD from '../assets/logos/mcd.svg';
import LogoMETA from '../assets/logos/meta.svg';
import LogoNFLX from '../assets/logos/nflx.svg';
import LogoNKE from '../assets/logos/nke.svg';
import LogoNVDA from '../assets/logos/nvda.svg';
import LogoORCL from '../assets/logos/orcl.svg';
import LogoSOL from '../assets/logos/sol.svg';
import LogoTSLA from '../assets/logos/tsla.svg';
import LogoUPS from '../assets/logos/ups.svg';
import LogoV from '../assets/logos/v.svg';
import LogoWMT from '../assets/logos/wmt.svg';
import LogoXRP from '../assets/logos/xrp.svg';

type Mark = {
  logo: Component<JSX.SvgSVGAttributes<SVGSVGElement>>;
  /** Official brand colour (Simple Icons, CC0). */
  color: string;
};

/**
 * Official marks for the instruments Fintail covers, from Simple Icons
 * (CC0). Anything without one gets a monogram, never an imitation.
 */
const MARKS: Record<string, Mark> = {
  AAPL: { logo: LogoAAPL, color: '#000000' },
  ADA: { logo: LogoADA, color: '#0133AD' },
  ADBE: { logo: LogoADBE, color: '#FF0000' },
  AMD: { logo: LogoAMD, color: '#ED1C24' },
  AMZN: { logo: LogoAMZN, color: '#FF9900' },
  AVGO: { logo: LogoAVGO, color: '#E31837' },
  BA: { logo: LogoBA, color: '#1D439C' },
  BAC: { logo: LogoBAC, color: '#012169' },
  BNB: { logo: LogoBNB, color: '#F0B90B' },
  BTC: { logo: LogoBTC, color: '#F7931A' },
  CAT: { logo: LogoCAT, color: '#FFCD11' },
  CRM: { logo: LogoCRM, color: '#00A1E0' },
  DOGE: { logo: LogoDOGE, color: '#C2A633' },
  ETH: { logo: LogoETH, color: '#3C3C3D' },
  GE: { logo: LogoGE, color: '#0870D8' },
  GOOGL: { logo: LogoGOOGL, color: '#4285F4' },
  GS: { logo: LogoGS, color: '#7399C6' },
  MCD: { logo: LogoMCD, color: '#FBC817' },
  META: { logo: LogoMETA, color: '#0467DF' },
  NFLX: { logo: LogoNFLX, color: '#E50914' },
  NKE: { logo: LogoNKE, color: '#111111' },
  NVDA: { logo: LogoNVDA, color: '#76B900' },
  ORCL: { logo: LogoORCL, color: '#F80000' },
  SOL: { logo: LogoSOL, color: '#9945FF' },
  TSLA: { logo: LogoTSLA, color: '#CC0000' },
  UPS: { logo: LogoUPS, color: '#150400' },
  V: { logo: LogoV, color: '#1A1F71' },
  WMT: { logo: LogoWMT, color: '#0071CE' },
  XRP: { logo: LogoXRP, color: '#25A768' },
};

/** Whether dark text reads better than white on a brand colour (WCAG luminance). */
function prefersDarkGlyph(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4;
}

/** An instrument's logo in a brand-coloured circle, or a neutral monogram. */
export function InstrumentLogo(props: { symbol: string; class?: string }) {
  const mark = () => MARKS[props.symbol];
  return (
    <span
      aria-hidden="true"
      class={cn(
        'inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[10px] font-semibold text-ink ring-1 ring-edge-muted',
        props.class
      )}
      style={
        mark()
          ? {
              background: mark()!.color,
              color: prefersDarkGlyph(mark()!.color) ? '#111111' : '#FFFFFF',
            }
          : undefined
      }
    >
      <Show
        when={mark()}
        fallback={props.symbol.replace(/[^A-Z0-9]/g, '').slice(0, 3)}
      >
        {(m) => <Dynamic component={m().logo} class="size-[55%]" />}
      </Show>
    </span>
  );
}
