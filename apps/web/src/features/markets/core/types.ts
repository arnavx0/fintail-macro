/** The asset classes Markets is organised by. */
export type AssetClass =
  | 'Indices'
  | 'Stocks'
  | 'ETFs'
  | 'Forex'
  | 'Crypto'
  | 'Commodities'
  | 'Rates';

export const ASSET_CLASSES: readonly AssetClass[] = [
  'Indices',
  'Stocks',
  'ETFs',
  'Forex',
  'Crypto',
  'Commodities',
  'Rates',
];

/**
 * The 11 GICS sectors (S&P/MSCI Global Industry Classification Standard),
 * in the standard order.
 */
export const GICS_SECTORS = [
  'Information Technology',
  'Communication Services',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Financials',
  'Health Care',
  'Industrials',
  'Materials',
  'Real Estate',
  'Utilities',
] as const;

export type GicsSector = (typeof GICS_SECTORS)[number];

/** Grouping inside each asset class, in display order. */
export const GROUPS: Record<AssetClass, readonly string[]> = {
  Indices: ['United States', 'Europe', 'Asia-Pacific'],
  Stocks: GICS_SECTORS,
  ETFs: ['Broad market', 'Dividend', 'Technology', 'Fixed income'],
  Forex: ['Majors', 'Asia', 'Crosses'],
  Crypto: ['Large cap'],
  Commodities: ['Energy', 'Metals', 'Agriculture'],
  Rates: ['United States', 'Singapore'],
};

/** How a quote is shown: money, index points, an FX rate, or a yield. */
export type QuoteUnit = 'currency' | 'points' | 'rate' | 'yield';

/** A tradable or benchmark instrument with its latest quote. */
export type Instrument = {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  /** Region for indices, GICS sector for stocks, category elsewhere. */
  group: string;
  unit: QuoteUnit;
  currency: string;
  exchange?: string;
  /** Country of listing for stocks and ETFs. */
  market?: 'US' | 'SG';
  price: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  volume?: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
};

/** A dated close, oldest first. */
export type PricePoint = { time: string; price: number };

export type MarketSnapshot = {
  asOf: string;
  instruments: readonly Instrument[];
  /** Daily closes per symbol over about a year, ending at today's price. */
  daily: Readonly<Record<string, readonly PricePoint[]>>;
  /** Today's intraday prices per symbol, every five minutes. */
  intraday: Readonly<Record<string, readonly PricePoint[]>>;
};

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y';

export const CHART_RANGES: readonly ChartRange[] = [
  '1D',
  '1W',
  '1M',
  '3M',
  '1Y',
];
