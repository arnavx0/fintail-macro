import { McpSetupCards } from '@core/component/AI/component/McpSetupCards';
import { SettingsPage, SettingsSection } from './primitives';

/**
 * The "MCP server" tab: setup instructions for pointing other agents and MCP
 * clients (Claude Code, Codex, IDEs, ...) at Fintail's own MCP server. Managing
 * Fintail's outbound connectors lives on the Integrations tab (see
 * `Integrations.tsx`).
 */
export function Agent() {
  return (
    <SettingsPage
      title="Fintail MCP server"
      description="Connect other agents and tools to your Fintail workspace."
    >
      <SettingsSection title="Connect a client">
        <McpSetupCards class="max-w-none" />
      </SettingsSection>
    </SettingsPage>
  );
}
