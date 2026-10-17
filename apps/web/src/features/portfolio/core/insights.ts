import {
  allocation,
  annualisedVolatility,
  concentrationWarnings,
  mergeHoldings,
  positionValue,
  timeWeightedReturn,
} from './metrics';
import type { Holding, ValuePoint } from './types';

/** One holding's share of today's portfolio move. */
export type Contributor = {
  symbol: string;
  name: string;
  /** Money gained or lost today. */
  contribution: number;
  /** The holding's own move today. */
  changePct: number;
};

/**
 * "Why did I move today?": each instrument's money contribution to today's
 * change, largest effect first. Contributions sum to the portfolio's day change.
 */
export function todaysContributors(holdings: readonly Holding[]): {
  total: number;
  contributors: Contributor[];
} {
  const merged = mergeHoldings(holdings).filter((h) => h.dayChange !== 0);
  return {
    total: merged.reduce((sum, h) => sum + h.dayChange, 0),
    contributors: merged
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        contribution: h.dayChange,
        changePct: h.dayChangePct,
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
  };
}

/** "Am I diversified?": the mix, the biggest positions and any concentration. */
export function diversification(holdings: readonly Holding[]) {
  const total = holdings.reduce((sum, h) => sum + positionValue(h), 0);
  return {
    assetClasses: allocation(holdings, (h) => h.assetClass),
    sectors: allocation(holdings, (h) => h.sector),
    topPositions: mergeHoldings(holdings)
      .slice(0, 3)
      .map((h) => ({
        symbol: h.symbol,
        weight: total === 0 ? 0 : h.value / total,
      })),
    warnings: concentrationWarnings(holdings),
  };
}

/** "Me vs the S&P 500": flow-neutral returns and volatility, side by side. */
export function benchmarkComparison(
  portfolio: readonly ValuePoint[],
  benchmark: readonly ValuePoint[]
) {
  const mine = timeWeightedReturn(portfolio);
  const index = timeWeightedReturn(benchmark);
  return {
    portfolioReturn: mine,
    benchmarkReturn: index,
    difference: mine - index,
    portfolioVolatility: annualisedVolatility(portfolio),
    benchmarkVolatility: annualisedVolatility(benchmark),
  };
}
