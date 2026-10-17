import { useAskFintail } from '@app/features/agents-view/primitives/ask-fintail';
import { createConnections } from '@app/features/connectors/primitives/connections';
import { mergeHoldings } from '@app/features/portfolio/core/metrics';
import { samplePortfolio } from '@app/features/portfolio/queries/sample-portfolio';
import {
  usePageViewTracking,
  withAuth,
} from '@components/app/split-layout/split-router/app-route-shell';
import { useSettingsState } from '@core/constant/SettingsState';
import { useUserId } from '@core/context/user';
import { lazy } from 'solid-js';
import { type MarketSource, MarketsProvider } from './context/markets-context';
import { sampleMarkets } from './queries/sample-markets';

const MarketsView = lazy(async () => ({
  default: (await import('./views/markets-view')).MarketsView,
}));

/** Illustrative quotes until a licensed market-data provider is connected. */
const SAMPLE_MARKET = sampleMarkets();
const sampleSource: MarketSource = {
  snapshot: () => SAMPLE_MARKET,
  isSample: () => true,
};

const SAMPLE_PORTFOLIO = samplePortfolio();
const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: SAMPLE_PORTFOLIO.baseCurrency,
});

/** "You hold 55 NVDA on Robinhood and Interactive Brokers, worth $10,252.00 (+34.2%)." */
function positionFor(symbol: string): string | undefined {
  const holding = mergeHoldings(SAMPLE_PORTFOLIO.holdings).find(
    (h) => h.symbol === symbol
  );
  if (!holding) return undefined;
  const platforms = holding.platformIds
    .map(
      (id) => SAMPLE_PORTFOLIO.platforms.find((p) => p.id === id)?.name ?? id
    )
    .join(' and ');
  const pnl = `${holding.unrealizedPct >= 0 ? '+' : '−'}${Math.abs(holding.unrealizedPct * 100).toFixed(1)}%`;
  return `You hold ${holding.quantity} ${symbol} on ${platforms}, worth ${money.format(holding.value)} (${pnl} total).`;
}

export const MarketsRouteView = withAuth(() => {
  usePageViewTracking('markets');
  const ask = useAskFintail();
  const userId = useUserId();
  const connections = createConnections(userId());
  const { openSettings } = useSettingsState();
  return (
    <MarketsProvider source={sampleSource}>
      <div class="size-full overflow-auto">
        <MarketsView
          onAsk={ask}
          positionFor={positionFor}
          connections={connections}
          onManageConnections={() => openSettings('Connections')}
        />
      </div>
    </MarketsProvider>
  );
});
