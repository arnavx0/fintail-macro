import type { AgentConversation } from '@service-agent-harness/agent-conversations';
import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('./queries/controls', () => ({
  useAgentConversationControl: () => ({
    mutate: mocks.mutate,
    isPending: false,
  }),
}));
vi.mock('@core/component/Toast/Toast', () => ({ toast: {} }));

import {
  AgentConversationContextBoundary,
  AgentConversationMessageStatus,
} from './agent-conversation-message';
import {
  AgentConversationsContext,
  type AgentConversationsContextValue,
} from './context';

afterEach(cleanup);

function conversation(
  state: AgentConversation['turns'][number]['state'] = 'running',
  retryable = false
): AgentConversation {
  return {
    channelId: 'channel',
    botId: 'bot',
    name: 'Researcher',
    avatarUrl: null,
    available: true,
    settingsChanged: false,
    sessions: [
      { sessionId: 'old', isCurrent: false, createdAt: '2026-10-01T00:00:00Z' },
      { sessionId: 'new', isCurrent: true, createdAt: '2026-10-01T01:00:00Z' },
    ],
    turns: [
      {
        sessionId: 'new',
        sourceMessageId: 'source',
        replyMessageId: 'reply',
        actionId: 'attempt',
        state,
        retryable,
        createdAt: '2026-10-01T01:00:00Z',
      },
    ],
  };
}

function context(
  data: () => AgentConversation
): AgentConversationsContextValue {
  return { conversations: () => [data()], refresh: vi.fn() };
}

it('places a fresh-context divider only before the session’s first source message', () => {
  const view = render(() => (
    <AgentConversationsContext.Provider value={context(conversation)}>
      <AgentConversationContextBoundary messageId="source" />
      <AgentConversationContextBoundary messageId="reply" />
    </AgentConversationsContext.Provider>
  ));
  expect(view.getAllByRole('separator')).toHaveLength(1);
});

it('tells a failed message as a notice with Retry as its one action', () => {
  const failed = conversation('failed', true);
  const view = render(() => (
    <AgentConversationsContext.Provider value={context(() => failed)}>
      <AgentConversationMessageStatus messageId="source" />
    </AgentConversationsContext.Provider>
  ));
  expect(view.getByRole('alert').textContent).toContain("Couldn't finish this");
  fireEvent.click(view.getByRole('button', { name: 'Retry' }));
  expect(mocks.mutate).toHaveBeenCalledWith({
    type: 'retry',
    conversation: failed,
    turn: failed.turns[0],
  });
});

it('keeps a stopped message to one quiet line', () => {
  const view = render(() => (
    <AgentConversationsContext.Provider
      value={context(() => conversation('stopped'))}
    >
      <AgentConversationMessageStatus messageId="source" />
    </AgentConversationsContext.Provider>
  ));
  expect(view.getByRole('status').textContent).toBe('Stopped');
  expect(view.container.querySelector('[data-agent-card]')).toBeNull();
});
