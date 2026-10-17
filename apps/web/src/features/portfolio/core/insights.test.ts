import { describe, expect, it } from 'vitest';
import {
  benchmarkComparison,
  diversification,
  todaysContributors,
} from './insights';
import type { Holding, ValuePoint } from './types';

const holding = (overrides: Partial<Holding>): Holding => ({
  platformId: 'robinhood',
  symbol: 'AAPL',
  name: 'Apple',
  assetClass: 'Stocks',
  sector: 'Technology',
  region: 'United States',
  quantity: 10,
  price: 110,
  previousClose: 100,
  costBasis: 1000,
  dividendsTtm: 0,
  dividendsNext12m: 0,
  ...overrides,
});

describe('portfolio insights', () => {
  it('ranks today’s contributors by money moved and sums to the day change', () => {
    const { total, contributors } = todaysContributors([
      holding({ symbol: 'AAPL' }), // +100
      holding({ symbol: 'BTC', quantity: 1, price: 50, previousClose: 300 }), // −250
      holding({ symbol: 'CASH', quantity: 500, price: 1, previousClose: 1 }), // 0
    ]);
    expect(contributors.map((c) => [c.symbol, c.contribution])).toEqual([
      ['BTC', -250],
      ['AAPL', 100],
    ]);
    expect(total).toBe(-150);
  });

  it('summarises the mix and the largest positions', () => {
    const result = diversification([
      holding({ symbol: 'NVDA', quantity: 30 }),
      holding({ symbol: 'JNJ', sector: 'Healthcare', quantity: 10 }),
    ]);
    expect(result.topPositions[0]).toEqual({ symbol: 'NVDA', weight: 0.75 });
    expect(result.sectors.map((s) => s.label)).toEqual([
      'Technology',
      'Healthcare',
    ]);
    expect(result.warnings.length).toBe(2);
  });

  it('compares flow-neutral returns with the benchmark', () => {
    const points = (values: number[]): ValuePoint[] =>
      values.map((value, i) => ({
        date: `2026-01-0${i + 1}`,
        value,
        netFlow: 0,
      }));
    const result = benchmarkComparison(points([100, 110]), points([100, 105]));
    expect(result.portfolioReturn).toBeCloseTo(0.1, 10);
    expect(result.benchmarkReturn).toBeCloseTo(0.05, 10);
    expect(result.difference).toBeCloseTo(0.05, 10);
  });
});
