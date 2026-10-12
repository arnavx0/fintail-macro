import { useOptionalAgentConversations } from '@app/features/agent-conversations/context';
import { createConnectorContinuation } from '@app/features/block-agent/primitives/create-connector-continuation';
import { toast } from '@core/component/Toast/Toast';
import { useUserId } from '@core/context/user';
import { AppConnectionContext } from '@core/pipedream/connection-context';
import {
  newMessageId,
  useSendMessageMutation,
} from '@queries/messages/mutations';
import { connectPipedreamApp } from '@queries/pipedream-connectors';
import type { ParentProps } from 'solid-js';
import { canResumeFrom } from './core/resume-from-reply';

/** What the person tells the agent once the app is connected. */
export function connectedMessage(name: string): string {
  return `I connected ${name}. Continue my previous request using the newly available tools.`;
}

/**
 * In a DM with an agent, a button to connect an app connects it in place
 * and then tells the agent, in the conversation, the way the person would
 * have - so the agent carries on where it stopped without them leaving the
 * DM. Anywhere else the button opens the connection settings as before.
 *
 * The agent is told to carry on only from its latest reply, while it is not
 * working on anything else: a button in an older reply still connects the
 * app, and says so, but continuing then would pick up whatever was asked
 * last instead of what that reply asked for.
 *
 * Always mounted: whether the channel is an agent DM is known only once it
 * loads, and switching a provider in then would remount the conversation.
 */
export function AgentDmConnections(
  props: ParentProps<{ channelId: string; agentDm: boolean }>
) {
  const userId = useUserId();
  const send = useSendMessageMutation();
  const conversations = useOptionalAgentConversations();
  const continuation = createConnectorContinuation({
    disabled: () => !props.agentDm || !userId(),
    revision: () => props.channelId,
    resumes: (reply) => {
      const turns = conversations
        ?.conversations()
        ?.flatMap((conversation) => conversation.turns);
      return !!reply && !!turns && canResumeFrom(reply, turns);
    },
    connect: (app) => {
      // Whether to carry on is decided once the sign-in finishes, against
      // turns read after it started.
      conversations?.refresh();
      return connectPipedreamApp(app);
    },
    resume: async (name) => {
      const senderId = userId();
      if (!senderId) throw new Error('Signed out');
      await send.mutateAsync({
        parent: { type: 'channel', id: props.channelId },
        senderId,
        optimisticId: newMessageId(),
        message: { content: connectedMessage(name) },
      });
    },
    notify: (message) => toast.alert(message),
  });
  return (
    <AppConnectionContext.Provider
      value={{ ...continuation, enabled: () => props.agentDm }}
    >
      {props.children}
    </AppConnectionContext.Provider>
  );
}
