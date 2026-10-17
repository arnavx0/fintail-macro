import { formatChange, formatPrice } from './format';
import { change, rangePosition } from './market-metrics';
import type { Instrument, PricePoint } from './types';

export type AnalysisSection = { title: string; body: string };

const pct = (share: number, digits = 1) =>
  `${share >= 0 ? '+' : '−'}${Math.abs(share * 100).toFixed(digits)}%`;

/** Change over the last `days` trading days of a daily series. */
function changeOver(daily: readonly PricePoint[], days: number) {
  const end = daily.at(-1)?.price ?? 0;
  const start = daily.at(-(days + 1))?.price ?? daily[0]?.price ?? 0;
  return start === 0 ? 0 : end / start - 1;
}

/** Annualised volatility of daily returns over the last `days`. */
function volatility(daily: readonly PricePoint[], days: number) {
  const window = daily.slice(-(days + 1));
  const returns = window.slice(1).map((p, i) => p.price / window[i].price - 1);
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance * 252);
}

function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * A factual read of one instrument from its own numbers: today, trend,
 * momentum, range, valuation against its sector, volatility, and how it
 * relates to the user's position. It describes; it never recommends buying,
 * selling or holding.
 */
export function instrumentAnalysis(input: {
  instrument: Instrument;
  daily: readonly PricePoint[];
  /** Other instruments in the same group, for sector comparisons. */
  peers: readonly Instrument[];
  /** "You hold …" line from the user's portfolio, when they own it. */
  position?: string;
}): AnalysisSection[] {
  const { instrument: i, daily, peers } = input;
  const today = change(i);
  const peerShares = peers
    .filter((p) => p.symbol !== i.symbol)
    .map((p) => change(p).share);
  const peerMove = peerShares.length
    ? peerShares.reduce((a, b) => a + b, 0) / peerShares.length
    : undefined;
  const sections: AnalysisSection[] = [];

  const versus =
    peerMove === undefined
      ? ''
      : Math.abs(today.share - peerMove) < 0.002
        ? ` That is in line with the rest of ${i.group}, which averaged ${pct(peerMove, 2)}.`
        : ` That is ${today.share > peerMove ? 'stronger' : 'weaker'} than the rest of ${i.group}, which averaged ${pct(peerMove, 2)}, so the move looks ${Math.sign(today.share) === Math.sign(peerMove) ? 'partly sector-wide' : 'specific to this name'}.`;
  sections.push({
    title: 'Today',
    body: `${i.name} is at ${formatPrice(i)}, ${formatChange(i, today.amount, today.share)} on the day, trading between ${formatPrice(i, i.dayLow)} and ${formatPrice(i, i.dayHigh)}.${versus}`,
  });

  const month = changeOver(daily, 21);
  const year = changeOver(daily, 252);
  const fifty = daily.slice(-50);
  const average =
    fifty.reduce((s, p) => s + p.price, 0) / Math.max(1, fifty.length);
  const aboveAverage = i.price >= average;
  sections.push({
    title: 'Trend',
    body: `Over the past month it has moved ${pct(month)}, and ${pct(year)} over the past year. It trades ${aboveAverage ? 'above' : 'below'} its 50-day average of ${formatPrice(i, average)}, ${aboveAverage ? 'a sign the recent trend has been upward' : 'a sign recent momentum has softened'}.`,
  });

  const position = rangePosition(i);
  sections.push({
    title: 'Range',
    body: `At ${Math.round(position * 100)}% of its 52-week range (${formatPrice(i, i.week52Low)} to ${formatPrice(i, i.week52High)}), it is ${position > 0.85 ? 'close to its yearly high' : position < 0.15 ? 'close to its yearly low' : 'in the middle of its yearly range'}.`,
  });

  if (i.assetClass === 'Stocks' && i.peRatio) {
    const sectorPe = median(
      peers.map((p) => p.peRatio).filter((pe): pe is number => pe !== undefined)
    );
    const relative =
      sectorPe === undefined
        ? ''
        : ` The ${i.group} median in Fintail's coverage is ${sectorPe.toFixed(1)}×, so it is valued ${i.peRatio > sectorPe * 1.15 ? 'at a premium to' : i.peRatio < sectorPe * 0.85 ? 'at a discount to' : 'roughly in line with'} its sector.`;
    const income = i.dividendYield
      ? ` It yields ${(i.dividendYield * 100).toFixed(2)}% in dividends.`
      : ' It pays little or no dividend.';
    sections.push({
      title: 'Valuation',
      body: `It trades at ${i.peRatio.toFixed(1)}× earnings.${relative}${income}`,
    });
  }

  const vol = volatility(daily, 63);
  sections.push({
    title: 'Volatility',
    body: `Annualised volatility over the last three months is ${(vol * 100).toFixed(0)}%, ${vol > 0.45 ? 'high, so large daily swings are normal' : vol > 0.25 ? 'moderate for its asset class' : 'relatively low'}.`,
  });

  if (input.position) {
    sections.push({
      title: 'Your position',
      body: `${input.position} Today's move changes that position by ${pct(today.share, 2)}.`,
    });
  }

  return sections;
}
