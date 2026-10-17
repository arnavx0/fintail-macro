import { describe, expect, it } from 'vitest';
import {
  concentrationWarnings,
  dailyReturns,
  mergeHoldings,
  portfolioTotals,
} from '../core/metrics';
import { samplePortfolio } from './sample-portfolio';

describe('sample portfolio', () => {
  const snapshot = samplePortfolio();

  it('ends each platform history at its holdings value and today’s move', () => {
    for (const platform of snapshot.platforms) {
      const totals = portfolioTotals(
        snapshot.holdings.filter((h) => h.platformId === platform.id)
      );
      const history = snapshot.history[platform.id];
      expect(history.at(-1)?.value).toBeCloseTo(totals.value, 6);
      expect(dailyReturns(history).at(-1)).toBeCloseTo(totals.dayChangePct, 10);
      expect(history.every((p) => p.value > 0)).toBe(true);
    }
  });

  it('is the same on every load', () => {
    expect(samplePortfolio()).toEqual(snapshot);
  });

  it('exercises merged holdings, income and a concentration warning', () => {
    expect(
      mergeHoldings(snapshot.holdings).find((h) => h.symbol === 'NVDA')
        ?.platformIds
    ).toEqual(['robinhood', 'ibkr']);
    expect(snapshot.upcomingDividends.length).toBeGreaterThan(0);
    expect(concentrationWarnings(snapshot.holdings)).toEqual([
      expect.stringMatching(/^Crypto makes up \d+% of your holdings\.$/),
    ]);
  });
});
