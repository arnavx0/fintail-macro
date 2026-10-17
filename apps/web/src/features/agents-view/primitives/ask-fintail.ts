import { useSplitLayout } from '@components/app/split-layout/layout';
import { useUserId } from '@core/context/user';
import { createPersistedComposerDraft } from './composer-draft';
import { openAgentComposer } from './open-composer';

/**
 * Ask the AI a question from anywhere in the app: prefill a new
 * conversation with the prompt and open it.
 */
export function useAskFintail() {
  const layout = useSplitLayout();
  const userId = useUserId();
  const draft = createPersistedComposerDraft(undefined, userId);
  return (prompt: string) => {
    draft.setDraft(prompt);
    openAgentComposer(layout);
  };
}
