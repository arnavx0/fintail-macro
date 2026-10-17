import { useAskFintail } from '@app/features/agents-view/primitives/ask-fintail';
import { createConnections } from '@app/features/connectors/primitives/connections';
import {
  usePageViewTracking,
  withAuth,
} from '@components/app/split-layout/split-router/app-route-shell';
import { useSettingsState } from '@core/constant/SettingsState';
import { useUserId } from '@core/context/user';
import { lazy } from 'solid-js';
import type { PortfolioSource } from './context/portfolio-context';
import { PortfolioProvider } from './context/portfolio-context';
import { samplePortfolio } from './queries/sample-portfolio';

const PortfolioView = lazy(async () => ({
  default: (await import('./views/portfolio-view')).PortfolioView,
}));

/**
 * The data the Portfolio section shows until brokers are connected: the
 * illustrative sample. Connected accounts replace this source, not the view.
 */
const SAMPLE_SNAPSHOT = samplePortfolio();
const sampleSource: PortfolioSource = {
  snapshot: () => SAMPLE_SNAPSHOT,
  isSample: () => true,
};

export const PortfolioRouteView = withAuth(() => {
  usePageViewTracking('portfolio');
  const ask = useAskFintail();
  const userId = useUserId();
  const connections = createConnections(userId());
  const { openSettings } = useSettingsState();
  return (
    <PortfolioProvider source={sampleSource}>
      <div class="size-full overflow-auto">
        <PortfolioView
          onAsk={ask}
          connections={connections}
          onManageConnections={() => openSettings('Connections')}
        />
      </div>
    </PortfolioProvider>
  );
});
