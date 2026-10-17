import { match } from 'ts-pattern';
import type { Instrument } from './types';

/** FX pairs quoted against these currencies use fewer decimals by convention. */
const LOW_PRECISION_QUOTE = ['JPY', 'INR'];

function fxDecimals(symbol: string) {
  const quote = symbol.split('/')[1] ?? '';
  return LOW_PRECISION_QUOTE.includes(quote) ? 2 : 4;
}

/** Decimals that keep a price readable: more for cheap assets, fewer for large ones. */
function currencyDecimals(price: number) {
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  return 6;
}

/** A price as markets quote it: `$247.30`, `6,705.40`, `1.1680`, `4.02%`. */
export function formatPrice(instrument: Instrument, price = instrument.price) {
  return match(instrument.unit)
    .with('currency', () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: instrument.currency,
        minimumFractionDigits: currencyDecimals(price),
        maximumFractionDigits: currencyDecimals(price),
      }).format(price)
    )
    .with('points', () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)
    )
    .with('rate', () => {
      const digits = fxDecimals(instrument.symbol);
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(price);
    })
    .with('yield', () => `${price.toFixed(2)}%`)
    .exhaustive();
}

/**
 * Today's change as markets show it: a signed percentage, except yields,
 * which move in basis points (`−3 bp`).
 */
export function formatChange(
  instrument: Instrument,
  amount: number,
  share: number
) {
  if (instrument.unit === 'yield') {
    const bp = Math.round(amount * 100);
    return `${bp > 0 ? '+' : bp < 0 ? '−' : ''}${Math.abs(bp)} bp`;
  }
  const pct = new Intl.NumberFormat(undefined, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(share));
  return `${share > 0 ? '+' : share < 0 ? '−' : ''}${pct}`;
}

/** `$3.67T`, `$145B` */
export function formatMarketCap(value: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

/** `48.2M` */
export function formatVolume(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
