import { describe, expect, it } from 'vitest';
import { portfolioAnalysis } from '../../portfolio/core/portfolio-analysis';
import { samplePortfolio } from '../../portfolio/queries/sample-portfolio';
import { sampleMarkets } from '../queries/sample-markets';
import { instrumentAnalysis } from './analysis';

/** Words that would turn information into a recommendation. */
const ADVICE =
  /\b(buy|sell|hold|should|recommend\w*|must|strong buy|target price)\b/i;

describe('on-the-spot analysis', () => {
  const market = sampleMarkets();

  it('describes every instrument without advice language', () => {
    for (const instrument of market.instruments) {
      const sections = instrumentAnalysis({
        instrument,
        daily: market.daily[instrument.symbol],
        peers: market.instruments.filter(
          (i) =>
            i.assetClass === instrument.assetClass &&
            i.group === instrument.group
        ),
      });
      expect(sections.length).toBeGreaterThanOrEqual(4);
      for (const s of sections) expect(s.body).not.toMatch(ADVICE);
    }
  });

  it('adds valuation for stocks and the user’s position when they own it', () => {
    const nvda = market.instruments.find((i) => i.symbol === 'NVDA')!;
    const sections = instrumentAnalysis({
      instrument: nvda,
      daily: market.daily.NVDA,
      peers: market.instruments.filter((i) => i.group === nvda.group),
      position: 'You own 55 NVDA.',
    });
    expect(sections.map((s) => s.title)).toEqual([
      'Today',
      'Trend',
      'Range',
      'Valuation',
      'Volatility',
      'Your position',
    ]);
  });

  it('summarises the portfolio without advice language', () => {
    const portfolio = samplePortfolio();
    const sections = portfolioAnalysis({
      holdings: portfolio.holdings,
      upcomingDividends: portfolio.upcomingDividends,
      currency: 'USD',
      periodReturn: 0.12,
      benchmarkReturn: 0.09,
      benchmarkName: 'S&P 500',
      rangeLabel: 'past year',
    });
    expect(sections).toHaveLength(4);
    for (const s of sections) expect(s.body).not.toMatch(ADVICE);
  });
});
