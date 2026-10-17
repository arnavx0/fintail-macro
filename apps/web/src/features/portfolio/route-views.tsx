import { createPersistedComposerDraft } from '@app/features/agents-view/primitives/composer-draft';
import { openAgentComposer } from '@app/features/agents-view/primitives/open-composer';
import { useSplitLayout } from '@components/app/split-layout/layout';
import {
  usePageViewTracking,
  withAuth,
} from '@components/app/split-layout/split-router/app-route-shell';
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

/** Ask the AI a question about the portfolio: prefill a new conversation and open it. */
export function useAskFintail() {
  const layout = useSplitLayout();
  const userId = useUserId();
  const draft = createPersistedComposerDraft(undefined, userId);
  return (prompt: string) => {
    draft.setDraft(prompt);
    openAgentComposer(layout);
  };
}

export const PortfolioRouteView = withAuth(() => {
  usePageViewTracking('portfolio');
  const ask = useAskFintail();
  return (
    <PortfolioProvider source={sampleSource}>
      <div class="size-full overflow-auto">
        <PortfolioView onAsk={ask} />
      </div>
    </PortfolioProvider>
  );
});
