/** Where an account lives: a brokerage for securities or an exchange for crypto. */
export type PlatformKind = 'brokerage' | 'crypto';

/** A connected brokerage or crypto platform. */
export type Platform = {
  id: string;
  name: string;
  kind: PlatformKind;
  /** Official logo URL when the data source provides one (SnapTrade does). */
  logoUrl?: string;
};

export type AssetClass = 'Stocks' | 'ETFs' | 'Crypto' | 'Cash';

/** One position on one platform, valued in the portfolio's base currency. */
export type Holding = {
  platformId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: string;
  region: string;
  quantity: number;
  /** Latest price. */
  price: number;
  /** Previous session's closing price. */
  previousClose: number;
  /** Total amount paid for the position. */
  costBasis: number;
  /** Dividends received over the last twelve months. */
  dividendsTtm: number;
  /** Expected dividend income over the next twelve months. */
  dividendsNext12m: number;
};

/** A day-end value of one platform's accounts. `netFlow` is money moved in (+) or out (-) that day. */
export type ValuePoint = {
  date: string;
  value: number;
  netFlow: number;
};

/** A dividend expected on a holding. */
export type UpcomingDividend = {
  symbol: string;
  platformId: string;
  payDate: string;
  amount: number;
};

/** Everything the Portfolio section shows, in one base currency. */
export type PortfolioSnapshot = {
  baseCurrency: string;
  asOf: string;
  platforms: readonly Platform[];
  holdings: readonly Holding[];
  /** Day-end values per platform, oldest first, on the same dates. */
  history: Readonly<Record<string, readonly ValuePoint[]>>;
  /** Benchmark index levels on the same dates, for comparison. */
  benchmark: { name: string; levels: readonly ValuePoint[] };
  upcomingDividends: readonly UpcomingDividend[];
};

/** Time ranges the performance chart offers. */
export type RangeId = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

export const RANGES: readonly RangeId[] = [
  '1W',
  '1M',
  '3M',
  'YTD',
  '1Y',
  'ALL',
];
