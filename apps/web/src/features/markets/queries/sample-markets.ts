import {
  seededRandom,
  seedFromString,
  standardNormal,
} from '@core/util/seeded-random';
import type {
  AssetClass,
  Instrument,
  MarketSnapshot,
  PricePoint,
  QuoteUnit,
} from '../core/types';

/**
 * An illustrative market so Markets, Portfolio, News and alerts can be built
 * and reviewed before a licensed data provider is connected. Prices are
 * plausible but are not live or real quotes.
 */

export const SAMPLE_AS_OF = '2026-10-16';
/** Matches the Portfolio sample's history so the S&P 500 can be its benchmark. */
export const DAILY_POINTS = 400;
const INTRADAY_POINTS = 79; // 09:30 to 16:00 every five minutes

type Row = {
  symbol: string;
  name: string;
  group: string;
  price: number;
  previousClose: number;
  /** Daily volatility of the generated history. */
  vol: number;
  marketCapB?: number;
  volumeM?: number;
  pe?: number;
  dividendYield?: number;
  exchange?: string;
  market?: 'US' | 'SG';
  currency?: string;
};

const r = (
  symbol: string,
  name: string,
  group: string,
  price: number,
  previousClose: number,
  vol: number,
  extra: Partial<Row> = {}
): Row => ({ symbol, name, group, price, previousClose, vol, ...extra });

const stock = (
  symbol: string,
  name: string,
  sector: string,
  price: number,
  previousClose: number,
  marketCapB: number,
  volumeM: number,
  pe: number | undefined,
  dividendYield = 0,
  exchange = 'NASDAQ'
) =>
  r(symbol, name, sector, price, previousClose, 0.017, {
    marketCapB,
    volumeM,
    pe,
    dividendYield,
    exchange,
    market: 'US',
  });

const UNIVERSE: Record<AssetClass, { unit: QuoteUnit; rows: Row[] }> = {
  Indices: {
    unit: 'points',
    rows: [
      r('SPX', 'S&P 500', 'United States', 6705.4, 6668.2, 0.0095),
      r('IXIC', 'Nasdaq Composite', 'United States', 22681.3, 22488.9, 0.012),
      r('NDX', 'Nasdaq-100', 'United States', 24893.6, 24680.1, 0.012),
      r(
        'DJI',
        'Dow Jones Industrial Average',
        'United States',
        46190.6,
        46021.3,
        0.008
      ),
      r('RUT', 'Russell 2000', 'United States', 2471.9, 2488.4, 0.014),
      r('VIX', 'CBOE Volatility Index', 'United States', 17.8, 19.2, 0.06),
      r('UKX', 'FTSE 100', 'Europe', 9421.3, 9410.5, 0.008),
      r('DAX', 'DAX 40', 'Europe', 24272.2, 24180.9, 0.01),
      r('CAC', 'CAC 40', 'Europe', 8152.4, 8186.0, 0.01),
      r('SX5E', 'Euro Stoxx 50', 'Europe', 5611.8, 5598.3, 0.01),
      r('N225', 'Nikkei 225', 'Asia-Pacific', 47805.1, 47218.6, 0.012),
      r('HSI', 'Hang Seng', 'Asia-Pacific', 25601.4, 25888.2, 0.014),
      r('STI', 'Straits Times Index', 'Asia-Pacific', 4352.7, 4331.5, 0.007),
      r('AS51', 'S&P/ASX 200', 'Asia-Pacific', 8951.2, 8978.6, 0.008),
      r('KOSPI', 'KOSPI', 'Asia-Pacific', 3621.9, 3570.4, 0.012),
      r('SHCOMP', 'Shanghai Composite', 'Asia-Pacific', 3881.5, 3868.0, 0.01),
    ],
  },
  Stocks: {
    unit: 'currency',
    rows: [
      stock(
        'AAPL',
        'Apple',
        'Information Technology',
        247.3,
        248.1,
        3670,
        48,
        37.6,
        0.0042
      ),
      stock(
        'MSFT',
        'Microsoft',
        'Information Technology',
        512.7,
        509.9,
        3810,
        19,
        37.1,
        0.0068
      ),
      stock(
        'NVDA',
        'NVIDIA',
        'Information Technology',
        186.4,
        182.9,
        4530,
        182,
        52.8,
        0.0002
      ),
      stock(
        'AVGO',
        'Broadcom',
        'Information Technology',
        344.1,
        338.6,
        1620,
        22,
        88.2,
        0.0068
      ),
      stock(
        'ORCL',
        'Oracle',
        'Information Technology',
        291.4,
        296.2,
        820,
        14,
        67.5,
        0.0069,
        'NYSE'
      ),
      stock(
        'AMD',
        'Advanced Micro Devices',
        'Information Technology',
        218.1,
        211.5,
        354,
        61,
        128.3
      ),
      stock(
        'CRM',
        'Salesforce',
        'Information Technology',
        244.6,
        246.0,
        234,
        7,
        37.9,
        0.0068,
        'NYSE'
      ),
      stock(
        'ADBE',
        'Adobe',
        'Information Technology',
        338.2,
        342.9,
        143,
        4,
        21.4
      ),
      stock(
        'GOOGL',
        'Alphabet',
        'Communication Services',
        251.9,
        248.6,
        3050,
        33,
        26.8,
        0.0033
      ),
      stock(
        'META',
        'Meta Platforms',
        'Communication Services',
        712.5,
        705.3,
        1790,
        11,
        25.9,
        0.003
      ),
      stock(
        'NFLX',
        'Netflix',
        'Communication Services',
        1203.4,
        1218.7,
        512,
        3,
        51.2
      ),
      stock(
        'DIS',
        'Walt Disney',
        'Communication Services',
        111.8,
        112.4,
        201,
        8,
        17.6,
        0.0089,
        'NYSE'
      ),
      stock(
        'AMZN',
        'Amazon',
        'Consumer Discretionary',
        216.4,
        214.1,
        2310,
        39,
        33.0
      ),
      stock(
        'TSLA',
        'Tesla',
        'Consumer Discretionary',
        268.1,
        262.4,
        862,
        96,
        172.4
      ),
      stock(
        'HD',
        'Home Depot',
        'Consumer Discretionary',
        391.2,
        388.0,
        389,
        3,
        26.7,
        0.0235,
        'NYSE'
      ),
      stock(
        'MCD',
        "McDonald's",
        'Consumer Discretionary',
        304.5,
        303.1,
        217,
        3,
        26.0,
        0.0244,
        'NYSE'
      ),
      stock(
        'NKE',
        'Nike',
        'Consumer Discretionary',
        68.9,
        70.2,
        102,
        12,
        33.7,
        0.0232,
        'NYSE'
      ),
      stock(
        'WMT',
        'Walmart',
        'Consumer Staples',
        103.6,
        102.9,
        826,
        15,
        39.1,
        0.0091,
        'NYSE'
      ),
      stock(
        'PG',
        'Procter & Gamble',
        'Consumer Staples',
        151.2,
        150.8,
        354,
        6,
        23.4,
        0.0279,
        'NYSE'
      ),
      stock(
        'KO',
        'Coca-Cola',
        'Consumer Staples',
        68.7,
        68.2,
        296,
        12,
        24.2,
        0.0297,
        'NYSE'
      ),
      stock(
        'COST',
        'Costco',
        'Consumer Staples',
        914.3,
        921.8,
        405,
        2,
        50.8,
        0.0057
      ),
      stock(
        'XOM',
        'Exxon Mobil',
        'Energy',
        112.4,
        113.9,
        478,
        14,
        15.8,
        0.0352,
        'NYSE'
      ),
      stock(
        'CVX',
        'Chevron',
        'Energy',
        151.8,
        153.5,
        263,
        7,
        19.3,
        0.0451,
        'NYSE'
      ),
      stock(
        'JPM',
        'JPMorgan Chase',
        'Financials',
        301.2,
        297.4,
        829,
        9,
        15.4,
        0.0199,
        'NYSE'
      ),
      stock(
        'V',
        'Visa',
        'Financials',
        344.9,
        343.1,
        671,
        6,
        33.6,
        0.0069,
        'NYSE'
      ),
      stock(
        'MA',
        'Mastercard',
        'Financials',
        571.6,
        568.3,
        518,
        3,
        38.5,
        0.0053,
        'NYSE'
      ),
      stock(
        'BAC',
        'Bank of America',
        'Financials',
        50.3,
        49.6,
        381,
        38,
        14.6,
        0.0223,
        'NYSE'
      ),
      stock(
        'GS',
        'Goldman Sachs',
        'Financials',
        781.5,
        770.1,
        240,
        2,
        17.2,
        0.0154,
        'NYSE'
      ),
      stock(
        'BRK.B',
        'Berkshire Hathaway',
        'Financials',
        492.8,
        494.0,
        1060,
        4,
        16.9,
        0,
        'NYSE'
      ),
      stock(
        'LLY',
        'Eli Lilly',
        'Health Care',
        828.6,
        812.4,
        742,
        4,
        54.1,
        0.0072,
        'NYSE'
      ),
      stock(
        'UNH',
        'UnitedHealth',
        'Health Care',
        352.4,
        359.8,
        319,
        9,
        15.2,
        0.0251,
        'NYSE'
      ),
      stock(
        'JNJ',
        'Johnson & Johnson',
        'Health Care',
        188.4,
        187.2,
        454,
        8,
        20.1,
        0.0276,
        'NYSE'
      ),
      stock(
        'ABBV',
        'AbbVie',
        'Health Care',
        228.9,
        226.5,
        404,
        6,
        109.0,
        0.0287,
        'NYSE'
      ),
      stock(
        'PFE',
        'Pfizer',
        'Health Care',
        24.9,
        24.7,
        141,
        33,
        13.2,
        0.069,
        'NYSE'
      ),
      stock(
        'CAT',
        'Caterpillar',
        'Industrials',
        512.3,
        505.8,
        240,
        3,
        26.1,
        0.0117,
        'NYSE'
      ),
      stock(
        'GE',
        'GE Aerospace',
        'Industrials',
        297.6,
        293.2,
        316,
        5,
        41.4,
        0.0048,
        'NYSE'
      ),
      stock(
        'BA',
        'Boeing',
        'Industrials',
        216.4,
        219.1,
        164,
        8,
        undefined,
        0,
        'NYSE'
      ),
      stock(
        'UPS',
        'United Parcel Service',
        'Industrials',
        85.3,
        86.0,
        72,
        6,
        12.7,
        0.0769,
        'NYSE'
      ),
      stock('LIN', 'Linde', 'Materials', 468.2, 466.1, 220, 2, 33.4, 0.0128),
      stock(
        'NEM',
        'Newmont',
        'Materials',
        89.6,
        86.3,
        98,
        11,
        16.1,
        0.0112,
        'NYSE'
      ),
      stock(
        'PLD',
        'Prologis',
        'Real Estate',
        118.4,
        117.6,
        110,
        4,
        32.5,
        0.0341,
        'NYSE'
      ),
      stock(
        'O',
        'Realty Income',
        'Real Estate',
        59.3,
        59.6,
        54,
        5,
        57.0,
        0.0544,
        'NYSE'
      ),
      stock(
        'AMT',
        'American Tower',
        'Real Estate',
        186.1,
        188.0,
        87,
        2,
        67.2,
        0.0365,
        'NYSE'
      ),
      stock(
        'NEE',
        'NextEra Energy',
        'Utilities',
        81.2,
        80.4,
        167,
        9,
        28.3,
        0.0279,
        'NYSE'
      ),
      stock(
        'DUK',
        'Duke Energy',
        'Utilities',
        124.6,
        124.1,
        97,
        3,
        20.6,
        0.0342,
        'NYSE'
      ),
      r('D05', 'DBS Group', 'Financials', 51.2, 50.8, 0.011, {
        marketCapB: 145,
        volumeM: 4,
        pe: 13.9,
        dividendYield: 0.058,
        exchange: 'SGX',
        market: 'SG',
        currency: 'SGD',
      }),
      r('O39', 'OCBC Bank', 'Financials', 16.9, 16.8, 0.01, {
        marketCapB: 76,
        volumeM: 6,
        pe: 10.4,
        dividendYield: 0.06,
        exchange: 'SGX',
        market: 'SG',
        currency: 'SGD',
      }),
      r('Z74', 'Singtel', 'Communication Services', 4.12, 4.08, 0.012, {
        marketCapB: 68,
        volumeM: 22,
        pe: 24.8,
        dividendYield: 0.041,
        exchange: 'SGX',
        market: 'SG',
        currency: 'SGD',
      }),
    ],
  },
  ETFs: {
    unit: 'currency',
    rows: [
      r('VOO', 'Vanguard S&P 500 ETF', 'Broad market', 618.2, 615.0, 0.0095, {
        volumeM: 6,
        dividendYield: 0.0118,
        exchange: 'NYSE Arca',
        market: 'US',
      }),
      r('QQQ', 'Invesco QQQ Trust', 'Technology', 605.3, 600.1, 0.012, {
        volumeM: 41,
        dividendYield: 0.0047,
        exchange: 'NASDAQ',
        market: 'US',
      }),
      r(
        'SCHD',
        'Schwab US Dividend Equity ETF',
        'Dividend',
        27.9,
        27.8,
        0.008,
        {
          volumeM: 16,
          dividendYield: 0.0378,
          exchange: 'NYSE Arca',
          market: 'US',
        }
      ),
      r(
        'VT',
        'Vanguard Total World Stock ETF',
        'Broad market',
        137.4,
        136.8,
        0.009,
        {
          volumeM: 3,
          dividendYield: 0.0172,
          exchange: 'NYSE Arca',
          market: 'US',
        }
      ),
      r(
        'BND',
        'Vanguard Total Bond Market ETF',
        'Fixed income',
        74.6,
        74.5,
        0.003,
        { volumeM: 7, dividendYield: 0.0371, exchange: 'NASDAQ', market: 'US' }
      ),
      r(
        'ES3',
        'SPDR Straits Times Index ETF',
        'Broad market',
        4.41,
        4.39,
        0.007,
        {
          volumeM: 2,
          dividendYield: 0.041,
          exchange: 'SGX',
          market: 'SG',
          currency: 'SGD',
        }
      ),
    ],
  },
  Forex: {
    unit: 'rate',
    rows: [
      r('EUR/USD', 'Euro / US Dollar', 'Majors', 1.168, 1.1654, 0.004),
      r('USD/JPY', 'US Dollar / Japanese Yen', 'Majors', 150.8, 151.42, 0.005),
      r('GBP/USD', 'British Pound / US Dollar', 'Majors', 1.342, 1.3391, 0.004),
      r('USD/CHF', 'US Dollar / Swiss Franc', 'Majors', 0.796, 0.7984, 0.004),
      r(
        'AUD/USD',
        'Australian Dollar / US Dollar',
        'Majors',
        0.652,
        0.6533,
        0.005
      ),
      r(
        'USD/CAD',
        'US Dollar / Canadian Dollar',
        'Majors',
        1.399,
        1.3976,
        0.003
      ),
      r(
        'NZD/USD',
        'New Zealand Dollar / US Dollar',
        'Majors',
        0.576,
        0.5751,
        0.005
      ),
      r(
        'USD/SGD',
        'US Dollar / Singapore Dollar',
        'Asia',
        1.295,
        1.2982,
        0.003
      ),
      r('USD/CNH', 'US Dollar / Offshore Yuan', 'Asia', 7.125, 7.1312, 0.002),
      r(
        'USD/HKD',
        'US Dollar / Hong Kong Dollar',
        'Asia',
        7.768,
        7.7691,
        0.0004
      ),
      r('USD/INR', 'US Dollar / Indian Rupee', 'Asia', 88.2, 88.05, 0.002),
      r(
        'USD/MYR',
        'US Dollar / Malaysian Ringgit',
        'Asia',
        4.215,
        4.2231,
        0.003
      ),
      r('EUR/GBP', 'Euro / British Pound', 'Crosses', 0.87, 0.8703, 0.003),
      r('EUR/JPY', 'Euro / Japanese Yen', 'Crosses', 176.1, 176.47, 0.005),
      r(
        'SGD/MYR',
        'Singapore Dollar / Malaysian Ringgit',
        'Crosses',
        3.255,
        3.2531,
        0.003
      ),
      r(
        'AUD/SGD',
        'Australian Dollar / Singapore Dollar',
        'Crosses',
        0.845,
        0.848,
        0.004
      ),
    ],
  },
  Crypto: {
    unit: 'currency',
    rows: [
      r('BTC', 'Bitcoin', 'Large cap', 108250, 106900, 0.028, {
        marketCapB: 2150,
        volumeM: 0.42,
      }),
      r('ETH', 'Ethereum', 'Large cap', 3910, 3985, 0.034, {
        marketCapB: 472,
        volumeM: 6.1,
      }),
      r('BNB', 'BNB', 'Large cap', 1150, 1162, 0.03, {
        marketCapB: 160,
        volumeM: 1.3,
      }),
      r('SOL', 'Solana', 'Large cap', 192.5, 188, 0.042, {
        marketCapB: 105,
        volumeM: 22,
      }),
      r('XRP', 'XRP', 'Large cap', 2.42, 2.38, 0.04, {
        marketCapB: 145,
        volumeM: 1900,
      }),
      r('ADA', 'Cardano', 'Large cap', 0.7, 0.716, 0.045, {
        marketCapB: 25,
        volumeM: 980,
      }),
      r('DOGE', 'Dogecoin', 'Large cap', 0.205, 0.198, 0.05, {
        marketCapB: 31,
        volumeM: 6400,
      }),
    ],
  },
  Commodities: {
    unit: 'currency',
    rows: [
      r('CL', 'WTI Crude Oil', 'Energy', 58.9, 59.6, 0.02),
      r('BZ', 'Brent Crude Oil', 'Energy', 62.7, 63.3, 0.019),
      r('NG', 'Natural Gas', 'Energy', 3.02, 2.96, 0.035),
      r('GC', 'Gold', 'Metals', 4250, 4218, 0.01),
      r('SI', 'Silver', 'Metals', 51.2, 50.3, 0.018),
      r('HG', 'Copper', 'Metals', 4.98, 5.03, 0.014),
      r('ZC', 'Corn', 'Agriculture', 4.2, 4.18, 0.013),
      r('ZW', 'Wheat', 'Agriculture', 5.05, 5.12, 0.016),
    ],
  },
  Rates: {
    unit: 'yield',
    rows: [
      r('US2Y', 'US 2-Year Treasury', 'United States', 3.48, 3.51, 0.012),
      r('US10Y', 'US 10-Year Treasury', 'United States', 4.02, 4.05, 0.009),
      r('US30Y', 'US 30-Year Treasury', 'United States', 4.6, 4.61, 0.008),
      r(
        'SG10Y',
        'Singapore 10-Year Government Bond',
        'Singapore',
        1.98,
        1.99,
        0.008
      ),
    ],
  },
};

/** Weekday dates ending at `SAMPLE_AS_OF`, oldest first. */
function tradingDays(count: number): string[] {
  const days: string[] = [];
  const day = new Date(`${SAMPLE_AS_OF}T00:00:00Z`);
  while (days.length < count) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6)
      days.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return days.reverse();
}

/**
 * A random walk that lands on `end`, built backwards so the last close is the
 * quoted price and the one before it is the previous close.
 */
function walkTo(
  end: number,
  previous: number,
  vol: number,
  times: readonly string[],
  seed: number
): PricePoint[] {
  const next = seededRandom(seed);
  const prices = new Array<number>(times.length);
  prices[times.length - 1] = end;
  if (times.length > 1) prices[times.length - 2] = previous;
  for (let i = times.length - 3; i >= 0; i--) {
    prices[i] = prices[i + 1] / (1 + 0.0004 + vol * standardNormal(next));
  }
  return times.map((time, i) => ({ time, price: prices[i] }));
}

/** Today's path from the previous close to the latest price. */
function intradayPath(row: Row, seed: number): PricePoint[] {
  const next = seededRandom(seed);
  const points: PricePoint[] = [];
  const start = Date.UTC(2026, 9, 16, 13, 30);
  let drift = row.previousClose;
  for (let i = 0; i < INTRADAY_POINTS; i++) {
    const t = i / (INTRADAY_POINTS - 1);
    drift *= 1 + (row.vol / 9) * standardNormal(next);
    // Blend the noise towards the close so the day ends on the quote.
    const price =
      drift * (1 - t) +
      row.price * t +
      (drift - row.previousClose) * t * (1 - t);
    points.push({
      time: new Date(start + i * 5 * 60_000).toISOString(),
      price:
        i === 0
          ? row.previousClose
          : i === INTRADAY_POINTS - 1
            ? row.price
            : price,
    });
  }
  return points;
}

/** The sample market, built once per load and identical every time. */
export function sampleMarkets(): MarketSnapshot {
  const days = tradingDays(DAILY_POINTS);
  const instruments: Instrument[] = [];
  const daily: Record<string, PricePoint[]> = {};
  const intraday: Record<string, PricePoint[]> = {};
  for (const [assetClass, { unit, rows }] of Object.entries(UNIVERSE) as [
    AssetClass,
    (typeof UNIVERSE)[AssetClass],
  ][]) {
    for (const row of rows) {
      const seed = seedFromString(row.symbol);
      const history = walkTo(row.price, row.previousClose, row.vol, days, seed);
      const today = intradayPath(row, seed + 1);
      const prices = history.map((p) => p.price);
      const dayPrices = today.map((p) => p.price);
      daily[row.symbol] = history;
      intraday[row.symbol] = today;
      instruments.push({
        symbol: row.symbol,
        name: row.name,
        assetClass,
        group: row.group,
        unit,
        currency: row.currency ?? 'USD',
        exchange: row.exchange,
        market: row.market,
        price: row.price,
        previousClose: row.previousClose,
        dayHigh: Math.max(...dayPrices),
        dayLow: Math.min(...dayPrices),
        week52High: Math.max(...prices, ...dayPrices),
        week52Low: Math.min(...prices, ...dayPrices),
        volume: row.volumeM === undefined ? undefined : row.volumeM * 1e6,
        marketCap:
          row.marketCapB === undefined ? undefined : row.marketCapB * 1e9,
        peRatio: row.pe,
        dividendYield: row.dividendYield,
      });
    }
  }
  return { asOf: SAMPLE_AS_OF, instruments, daily, intraday };
}
