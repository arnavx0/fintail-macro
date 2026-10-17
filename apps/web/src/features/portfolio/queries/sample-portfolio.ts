import { sampleMarkets } from '@app/features/markets/queries/sample-markets';
import { seededRandom, standardNormal } from '@core/util/seeded-random';
import { portfolioTotals } from '../core/metrics';
import type {
  Holding,
  Platform,
  PortfolioSnapshot,
  UpcomingDividend,
  ValuePoint,
} from '../core/types';

/**
 * A fixed, clearly-labelled sample portfolio so the Portfolio section can be
 * built and reviewed before brokers are connected (SnapTrade, Phase 3).
 * Prices and quantities are illustrative, not live market data.
 */

const AS_OF = '2026-10-16';
const HISTORY_DAYS = 400;

export const PLATFORMS: Platform[] = [
  { id: 'robinhood', name: 'Robinhood', kind: 'brokerage' },
  { id: 'ibkr', name: 'Interactive Brokers', kind: 'brokerage' },
  { id: 'coinbase', name: 'Coinbase', kind: 'crypto' },
  { id: 'binance', name: 'Binance', kind: 'crypto' },
];

export type Seed = Omit<Holding, 'dividendsTtm' | 'dividendsNext12m'> &
  Partial<Pick<Holding, 'dividendsTtm' | 'dividendsNext12m'>>;

export const SEEDS: Seed[] = [
  {
    platformId: 'robinhood',
    symbol: 'NVDA',
    name: 'NVIDIA',
    assetClass: 'Stocks',
    sector: 'Technology',
    region: 'United States',
    quantity: 40,
    price: 186.4,
    previousClose: 182.9,
    costBasis: 4200,
  },
  {
    platformId: 'robinhood',
    symbol: 'AAPL',
    name: 'Apple',
    assetClass: 'Stocks',
    sector: 'Technology',
    region: 'United States',
    quantity: 25,
    price: 247.3,
    previousClose: 248.1,
    costBasis: 4900,
    dividendsTtm: 26,
    dividendsNext12m: 27,
  },
  {
    platformId: 'robinhood',
    symbol: 'TSLA',
    name: 'Tesla',
    assetClass: 'Stocks',
    sector: 'Consumer discretionary',
    region: 'United States',
    quantity: 10,
    price: 268.1,
    previousClose: 262.4,
    costBasis: 2600,
  },
  {
    platformId: 'robinhood',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetClass: 'ETFs',
    sector: 'Broad market',
    region: 'United States',
    quantity: 12,
    price: 618.2,
    previousClose: 615.0,
    costBasis: 6100,
    dividendsTtm: 85.2,
    dividendsNext12m: 88,
  },
  {
    platformId: 'robinhood',
    symbol: 'USD',
    name: 'Cash',
    assetClass: 'Cash',
    sector: 'Cash',
    region: 'United States',
    quantity: 1500,
    price: 1,
    previousClose: 1,
    costBasis: 1500,
  },
  {
    platformId: 'ibkr',
    symbol: 'MSFT',
    name: 'Microsoft',
    assetClass: 'Stocks',
    sector: 'Technology',
    region: 'United States',
    quantity: 15,
    price: 512.7,
    previousClose: 509.9,
    costBasis: 5800,
    dividendsTtm: 49.8,
    dividendsNext12m: 54.6,
  },
  {
    platformId: 'ibkr',
    symbol: 'NVDA',
    name: 'NVIDIA',
    assetClass: 'Stocks',
    sector: 'Technology',
    region: 'United States',
    quantity: 15,
    price: 186.4,
    previousClose: 182.9,
    costBasis: 2100,
  },
  {
    platformId: 'ibkr',
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    assetClass: 'Stocks',
    sector: 'Healthcare',
    region: 'United States',
    quantity: 20,
    price: 188.4,
    previousClose: 187.2,
    costBasis: 3150,
    dividendsTtm: 104,
    dividendsNext12m: 108,
  },
  {
    platformId: 'ibkr',
    symbol: 'O',
    name: 'Realty Income',
    assetClass: 'Stocks',
    sector: 'Real estate',
    region: 'United States',
    quantity: 60,
    price: 59.3,
    previousClose: 59.6,
    costBasis: 3400,
    dividendsTtm: 193.2,
    dividendsNext12m: 194.4,
  },
  {
    platformId: 'ibkr',
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    assetClass: 'ETFs',
    sector: 'Broad market',
    region: 'United States',
    quantity: 80,
    price: 27.9,
    previousClose: 27.8,
    costBasis: 2150,
    dividendsTtm: 84,
    dividendsNext12m: 86,
  },
  {
    platformId: 'coinbase',
    symbol: 'BTC',
    name: 'Bitcoin',
    assetClass: 'Crypto',
    sector: 'Crypto',
    region: 'Global',
    quantity: 0.12,
    price: 108250,
    previousClose: 106900,
    costBasis: 9000,
  },
  {
    platformId: 'coinbase',
    symbol: 'ETH',
    name: 'Ethereum',
    assetClass: 'Crypto',
    sector: 'Crypto',
    region: 'Global',
    quantity: 1.8,
    price: 3910,
    previousClose: 3985,
    costBasis: 4800,
  },
  {
    platformId: 'binance',
    symbol: 'SOL',
    name: 'Solana',
    assetClass: 'Crypto',
    sector: 'Crypto',
    region: 'Global',
    quantity: 40,
    price: 192.5,
    previousClose: 188,
    costBasis: 5300,
  },
  {
    platformId: 'binance',
    symbol: 'BNB',
    name: 'BNB',
    assetClass: 'Crypto',
    sector: 'Crypto',
    region: 'Global',
    quantity: 4,
    price: 1150,
    previousClose: 1162,
    costBasis: 2750,
  },
  {
    platformId: 'binance',
    symbol: 'USDT',
    name: 'Tether (cash)',
    assetClass: 'Cash',
    sector: 'Cash',
    region: 'Global',
    quantity: 2000,
    price: 1,
    previousClose: 1,
    costBasis: 2000,
  },
];

const MARKET = sampleMarkets();

/** Every holding is priced from the sample market, so pages never disagree. */
const HOLDINGS: Holding[] = SEEDS.map((seed) => {
  const quote = MARKET.instruments.find((i) => i.symbol === seed.symbol);
  return {
    dividendsTtm: 0,
    dividendsNext12m: 0,
    ...seed,
    price: quote?.price ?? seed.price,
    previousClose: quote?.previousClose ?? seed.previousClose,
  };
});

export const UPCOMING_DIVIDENDS: UpcomingDividend[] = [
  { symbol: 'O', platformId: 'ibkr', payDate: '2026-10-31', amount: 16.2 },
  { symbol: 'JNJ', platformId: 'ibkr', payDate: '2026-12-09', amount: 27 },
  { symbol: 'MSFT', platformId: 'ibkr', payDate: '2026-12-11', amount: 13.65 },
  { symbol: 'SCHD', platformId: 'ibkr', payDate: '2026-12-15', amount: 21.5 },
  { symbol: 'VOO', platformId: 'robinhood', payDate: '2026-12-29', amount: 22 },
  {
    symbol: 'AAPL',
    platformId: 'robinhood',
    payDate: '2026-11-13',
    amount: 6.75,
  },
];

/** Daily drift and volatility by platform, so crypto swings more than stocks. */
export const PROFILE: Record<
  string,
  { drift: number; vol: number; deposit: number }
> = {
  robinhood: { drift: 0.0006, vol: 0.013, deposit: 300 },
  ibkr: { drift: 0.0004, vol: 0.009, deposit: 400 },
  coinbase: { drift: 0.0009, vol: 0.032, deposit: 150 },
  binance: { drift: 0.0008, vol: 0.036, deposit: 0 },
};

/** Weekdays ending at `AS_OF`, oldest first. */
function tradingDates(): string[] {
  const dates: string[] = [];
  const day = new Date(`${AS_OF}T00:00:00Z`);
  while (dates.length < HISTORY_DAYS) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      dates.push(day.toISOString().slice(0, 10));
    }
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return dates.reverse();
}

/**
 * A value history that ends exactly at the platform's current value, with
 * today's move equal to its holdings' day change and a monthly deposit.
 */
function platformHistory(
  dates: readonly string[],
  platformId: string,
  seed: number
): ValuePoint[] {
  const { drift, vol, deposit } = PROFILE[platformId];
  const today = portfolioTotals(
    HOLDINGS.filter((h) => h.platformId === platformId)
  );
  const next = seededRandom(seed);
  const returns = dates.map((_, i) =>
    i === dates.length - 1
      ? today.dayChangePct
      : drift + vol * standardNormal(next)
  );
  const flows = dates.map((date, i) =>
    i > 0 && date.slice(5, 7) !== dates[i - 1].slice(5, 7) ? deposit : 0
  );
  // V_t = V_{t-1}(1 + r_t) + F_t is linear in V_0: solve for the V_0 that
  // lands on today's value.
  let growth = 1;
  let flowsGrown = 0;
  for (let i = 1; i < dates.length; i++) {
    growth *= 1 + returns[i];
    flowsGrown = flowsGrown * (1 + returns[i]) + flows[i];
  }
  const start = (today.value - flowsGrown) / growth;
  const points: ValuePoint[] = [{ date: dates[0], value: start, netFlow: 0 }];
  for (let i = 1; i < dates.length; i++) {
    points.push({
      date: dates[i],
      value: points[i - 1].value * (1 + returns[i]) + flows[i],
      netFlow: flows[i],
    });
  }
  return points;
}

/** The S&P 500 from the sample market, on the same dates as the history. */
function benchmarkLevels(dates: readonly string[]): ValuePoint[] {
  const closes = new Map(
    (MARKET.daily.SPX ?? []).map((point) => [point.time, point.price])
  );
  let last = closes.values().next().value ?? 0;
  return dates.map((date) => {
    last = closes.get(date) ?? last;
    return { date, value: last, netFlow: 0 };
  });
}

/** The sample snapshot, built once. */
export function samplePortfolio(): PortfolioSnapshot {
  const dates = tradingDates();
  return {
    baseCurrency: 'USD',
    asOf: AS_OF,
    platforms: PLATFORMS,
    holdings: HOLDINGS,
    history: Object.fromEntries(
      PLATFORMS.map((platform, index) => [
        platform.id,
        platformHistory(dates, platform.id, 101 + index * 17),
      ])
    ),
    benchmark: { name: 'S&P 500', levels: benchmarkLevels(dates) },
    upcomingDividends: UPCOMING_DIVIDENDS,
  };
}
