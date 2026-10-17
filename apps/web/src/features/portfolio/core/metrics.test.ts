import { describe, expect, it } from 'vitest';
import {
  allocation,
  annualisedVolatility,
  combineHistory,
  concentrationWarnings,
  maxDrawdown,
  mergeHoldings,
  moneyWeightedReturn,
  portfolioTotals,
  rangeStartIndex,
  timeWeightedReturn,
} from './metrics';
import type { Holding, ValuePoint } from './types';

const holding = (overrides: Partial<Holding>): Holding => ({
  platformId: 'robinhood',
  symbol: 'AAPL',
  name: 'Apple',
  assetClass: 'Stocks',
  sector: 'Technology',
  region: 'US',
  quantity: 10,
  price: 110,
  previousClose: 100,
  costBasis: 1000,
  dividendsTtm: 0,
  dividendsNext12m: 0,
  ...overrides,
});

const point = (date: string, value: number, netFlow = 0): ValuePoint => ({
  date,
  value,
  netFlow,
});

describe('portfolio totals', () => {
  it('values positions and measures today against the previous close', () => {
    const totals = portfolioTotals([
      holding({}),
      holding({
        symbol: 'BTC',
        quantity: 1,
        price: 50,
        previousClose: 60,
        costBasis: 40,
      }),
    ]);
    // 10 × 110 + 1 × 50
    expect(totals.value).toBe(1150);
    // 10 × (110 − 100) + 1 × (50 − 60)
    expect(totals.dayChange).toBe(90);
    expect(totals.dayChangePct).toBeCloseTo(90 / 1060, 10);
    expect(totals.unrealized).toBe(1150 - 1040);
  });
});

describe('returns', () => {
  it('does not count a deposit as a gain', () => {
    // 1000 → deposit 1000 on day 1 → worth 2000: no performance.
    const points = [point('2026-01-01', 1000), point('2026-01-02', 2000, 1000)];
    expect(timeWeightedReturn(points)).toBeCloseTo(0, 10);
    expect(moneyWeightedReturn(points)).toBeCloseTo(0, 10);
  });

  it('chains daily returns for the time-weighted return', () => {
    // +10% then −10%: 1.1 × 0.9 − 1 = −1%.
    const points = [
      point('2026-01-01', 100),
      point('2026-01-02', 110),
      point('2026-01-03', 99),
    ];
    expect(timeWeightedReturn(points)).toBeCloseTo(-0.01, 10);
  });

  it('weights a mid-period deposit by the time it was invested (Modified Dietz)', () => {
    // Start 1000, deposit 1000 halfway, end 2200.
    // Gain = 2200 − 1000 − 1000 = 200; invested = 1000 + 0.5 × 1000 = 1500.
    const points = [
      point('2026-01-01', 1000),
      point('2026-01-02', 2000, 1000),
      point('2026-01-03', 2200),
    ];
    expect(moneyWeightedReturn(points)).toBeCloseTo(200 / 1500, 10);
  });

  it('measures the deepest fall from a peak', () => {
    const points = [
      point('2026-01-01', 100),
      point('2026-01-02', 120),
      point('2026-01-03', 90),
      point('2026-01-04', 130),
    ];
    expect(maxDrawdown(points)).toBeCloseTo(90 / 120 - 1, 10);
  });

  it('annualises the sample standard deviation of daily returns', () => {
    // Daily returns +1% and −1%: sample sd = √2 × 1%.
    const points = [
      point('2026-01-01', 100),
      point('2026-01-02', 101),
      point('2026-01-03', 99.99),
    ];
    expect(annualisedVolatility(points)).toBeCloseTo(
      Math.SQRT2 * 0.01 * Math.sqrt(252),
      6
    );
  });
});

describe('ranges and history', () => {
  it('starts YTD at the first point of the year', () => {
    const points = [
      point('2025-12-30', 1),
      point('2025-12-31', 1),
      point('2026-01-02', 1),
      point('2026-03-01', 1),
    ];
    expect(rangeStartIndex(points, 'YTD')).toBe(2);
    expect(rangeStartIndex(points, 'ALL')).toBe(0);
  });

  it('adds platforms together date by date', () => {
    expect(
      combineHistory([
        [point('2026-01-01', 100, 10)],
        [point('2026-01-01', 50, -5)],
      ])
    ).toEqual([point('2026-01-01', 150, 5)]);
  });
});

describe('composition', () => {
  it('merges one instrument held on two platforms', () => {
    const merged = mergeHoldings([
      holding({ platformId: 'robinhood', quantity: 10 }),
      holding({ platformId: 'ibkr', quantity: 5, costBasis: 500 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(15);
    expect(merged[0].platformIds).toEqual(['robinhood', 'ibkr']);
    expect(merged[0].weight).toBe(1);
  });

  it('folds small slices into Other', () => {
    const holdings = 'ABCDEFGH'
      .split('')
      .map((s, i) => holding({ symbol: s, sector: s, quantity: 10 - i }));
    const slices = allocation(holdings, (h) => h.sector);
    expect(slices).toHaveLength(6);
    expect(slices.at(-1)?.label).toBe('Other');
    expect(slices.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(1, 10);
  });

  it('flags a dominant position and sector', () => {
    expect(
      concentrationWarnings([
        holding({ symbol: 'NVDA', quantity: 30 }),
        holding({ symbol: 'JNJ', sector: 'Healthcare', quantity: 10 }),
      ])
    ).toEqual([
      'NVDA is 75% of your portfolio.',
      'Technology makes up 75% of your holdings.',
    ]);
  });
});
