import { useSplitLayout } from '@components/app/split-layout/layout';
import { ENABLE_FINTAIL } from '@core/constant/featureFlags';
import { useUserId } from '@core/context/user';
import { triggerFocusInput } from '@core/directive/focusInput';
import {
  createPersistedComposerDraft,
  HOME_CONVERSATION_DRAFT_KEY,
} from './composer-draft';
import { openAgentComposer } from './open-composer';

/**
 * Ask the AI a question from anywhere in the app: prefill a new conversation
 * with the prompt and open it. Fintail has no separate Agents page, so the
 * question lands in Home's composer; Macro opens the Agents composer.
 */
export function useAskFintail() {
  const layout = useSplitLayout();
  const userId = useUserId();
  const agentsDraft = createPersistedComposerDraft(undefined, userId);
  const homeDraft = createPersistedComposerDraft(
    HOME_CONVERSATION_DRAFT_KEY,
    userId
  );
  return (prompt: string) => {
    if (!ENABLE_FINTAIL) {
      agentsDraft.setDraft(prompt);
      openAgentComposer(layout);
      return;
    }
    homeDraft.setDraft(prompt);
    layout.openWithSplit(
      { type: 'component', id: 'home' },
      { referredFrom: 'launcher' }
    );
    triggerFocusInput(() =>
      document.querySelector<HTMLElement>(
        '[data-home-composer-align] [contenteditable="true"]'
      )
    );
  };
}
