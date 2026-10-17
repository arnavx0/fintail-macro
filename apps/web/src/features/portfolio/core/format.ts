const currencyFormats = new Map<string, Intl.NumberFormat>();
const compactFormats = new Map<string, Intl.NumberFormat>();

function currencyFormat(currency: string) {
  let format = currencyFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    currencyFormats.set(currency, format);
  }
  return format;
}

/** `S$12,345.67` */
export function formatMoney(value: number, currency: string) {
  return currencyFormat(currency).format(value);
}

/** `+S$1,234.50` / `−S$1,234.50`, signed so a gain reads as a gain without colour. */
export function formatSignedMoney(value: number, currency: string) {
  const abs = currencyFormat(currency).format(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

/** `S$1.2M` for axis ticks and tight spaces. */
export function formatCompactMoney(value: number, currency: string) {
  let format = compactFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    compactFormats.set(currency, format);
  }
  return format.format(value);
}

const percentFormat = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `+3.42%` / `−1.10%` */
export function formatSignedPercent(share: number) {
  const abs = percentFormat.format(Math.abs(share));
  if (share > 0) return `+${abs}`;
  if (share < 0) return `−${abs}`;
  return abs;
}

/** `18.0%` for weights and allocations. */
export function formatWeight(share: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(share);
}

/** Direction of a change, for the gain/loss colour tokens. */
export function direction(value: number): 'up' | 'down' | 'flat' {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}
