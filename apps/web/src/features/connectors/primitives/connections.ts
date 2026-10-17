import { makePersistedState } from '@app/lib/persistence';
import { createUserScopedStorage } from '@core/util/userScopedStorage';
import { Result } from 'neverthrow';
import { createSignal } from 'solid-js';
import { z } from 'zod';
import { type ConnectionState, INITIAL_CONNECTIONS } from '../core/catalogue';

const parseJson = Result.fromThrowable(
  (raw: string): unknown => JSON.parse(raw),
  () => 'invalid json' as const
);

const STORED = z.object({
  snaptrade: z.boolean(),
  brokers: z.array(z.string()),
  services: z.record(z.string(), z.boolean()),
});

/**
 * The user's finance connectors, remembered per user on this device until
 * connections are stored server-side with the MCP connector (Phase 3).
 */
export function createConnections(userId: string | undefined) {
  const storage = createUserScopedStorage('fintail-connections-v1');
  const [state, setState] = makePersistedState(
    createSignal<ConnectionState>(INITIAL_CONNECTIONS),
    {
      storages: {
        restore: () => {
          if (!userId) return;
          const raw = storage.read(userId);
          if (!raw) return;
          const json = parseJson(raw);
          if (json.isErr()) return;
          const parsed = STORED.safeParse(json.value);
          return parsed.success ? parsed.data : undefined;
        },
        write: (value) => {
          if (userId) storage.write(userId, JSON.stringify(value));
        },
      },
    }
  );
  return {
    state,
    setSnaptrade: (on: boolean) => setState({ ...state(), snaptrade: on }),
    toggleBroker: (id: string) => {
      const brokers = state().brokers.includes(id)
        ? state().brokers.filter((b) => b !== id)
        : [...state().brokers, id];
      setState({ ...state(), brokers });
    },
    setService: (id: string, on: boolean) =>
      setState({ ...state(), services: { ...state().services, [id]: on } }),
  };
}

export type Connections = ReturnType<typeof createConnections>;
