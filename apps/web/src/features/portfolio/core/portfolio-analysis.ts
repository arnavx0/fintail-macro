import { formatMoney, formatSignedPercent, formatWeight } from './format';
import { todaysContributors } from './insights';
import {
  allocation,
  concentrationWarnings,
  incomeSummary,
  mergeHoldings,
  portfolioTotals,
} from './metrics';
import type { Holding, UpcomingDividend } from './types';

export type AnalysisSection = { title: string; body: string };

/**
 * A factual overview of the selected accounts for questions the instant
 * answers do not cover: where things stand, what moved, the mix, risk and
 * income. It describes; it never recommends buying, selling or holding.
 */
export function portfolioAnalysis(input: {
  holdings: readonly Holding[];
  upcomingDividends: readonly UpcomingDividend[];
  currency: string;
  /** Time-weighted return and the benchmark's over the chart range. */
  periodReturn: number;
  benchmarkReturn: number;
  benchmarkName: string;
  rangeLabel: string;
}): AnalysisSection[] {
  const { holdings, currency } = input;
  const totals = portfolioTotals(holdings);
  const { contributors } = todaysContributors(holdings);
  const mix = allocation(holdings, (h) => h.assetClass);
  const top = mergeHoldings(holdings)[0];
  const warnings = concentrationWarnings(holdings);
  const income = incomeSummary(holdings, input.upcomingDividends);
  const leader = contributors[0];

  return [
    {
      title: 'Where you stand',
      body: `Your selected accounts are worth ${formatMoney(totals.value, currency)}, ${formatSignedPercent(totals.dayChangePct)} today and ${formatSignedPercent(totals.unrealizedPct)} on what you paid.`,
    },
    {
      title: 'What moved',
      body: leader
        ? `${leader.symbol} had the largest effect today (${formatSignedPercent(leader.changePct)}). Over the ${input.rangeLabel} your portfolio returned ${formatSignedPercent(input.periodReturn)} against ${formatSignedPercent(input.benchmarkReturn)} for the ${input.benchmarkName}.`
        : `Nothing has moved today. Over the ${input.rangeLabel} your portfolio returned ${formatSignedPercent(input.periodReturn)} against ${formatSignedPercent(input.benchmarkReturn)} for the ${input.benchmarkName}.`,
    },
    {
      title: 'Mix and risk',
      body: `${mix.map((s) => `${s.label} ${formatWeight(s.weight)}`).join(', ')}. ${top ? `Your largest holding is ${top.symbol} at ${formatWeight(top.weight)}. ` : ''}${warnings.length ? warnings.join(' ') : 'No single holding or sector dominates.'}`,
    },
    {
      title: 'Income',
      body: `Dividends are on track for ${formatMoney(income.forward, currency)} over the next 12 months, a ${formatWeight(income.forwardYield)} yield on today's value.`,
    },
  ];
}
