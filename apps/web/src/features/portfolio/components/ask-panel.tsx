import SparkleIcon from '@phosphor/sparkle.svg';
import XIcon from '@phosphor/x.svg';
import { Button, cn } from '@ui';
import {
  createEffect,
  createSignal,
  For,
  type JSX,
  on,
  onCleanup,
  Show,
} from 'solid-js';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const OPEN_MS = 340;
const STAGGER_MS = 35;
const MAX_STAGGERED = 8;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export type AskQuestion = {
  id: string;
  label: string;
  prompt: string;
  /** The holding a typed question is about. */
  symbol?: string;
};

/**
 * Animate an answer's rows in one after another. Rows opt in with
 * `data-ask-row`; only opacity and transform move, so it stays on the GPU.
 */
function staggerRows(root: HTMLElement) {
  if (prefersReducedMotion()) return;
  root.querySelectorAll<HTMLElement>('[data-ask-row]').forEach((row, index) => {
    row.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 260,
        delay: Math.min(index, MAX_STAGGERED) * STAGGER_MS,
        easing: EASE,
        fill: 'backwards',
      }
    );
  });
}

/**
 * Suggested questions that open an answer panel under them. The panel
 * slides down, its answer is computed instantly from the user's numbers, and
 * a compact field sends a follow-up to the Fintail agent.
 */
export function AskPanel(props: {
  questions: readonly AskQuestion[];
  active: string | undefined;
  onSelect: (id: string | undefined) => void;
  /** Send a prompt to the Fintail agent. */
  onAsk: (prompt: string) => void;
  /** The computed answer for the active question. */
  answer: JSX.Element;
  /** A typed question that is not one of the suggestions: its heading and prompt. */
  custom?: AskQuestion;
  /** Answer a typed question. */
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = createSignal('');
  const [shell, setShell] = createSignal<HTMLDivElement>();
  const [body, setBody] = createSignal<HTMLDivElement>();
  const [rendered, setRendered] = createSignal(props.active !== undefined);
  const [followUp, setFollowUp] = createSignal('');
  let running: Animation | undefined;

  const question = () =>
    props.custom?.id === props.active
      ? props.custom
      : props.questions.find((q) => q.id === props.active);

  // Imperative Web Animations for open, close and question switches.
  createEffect(
    on(
      () => props.active,
      (active, previous) => {
        running?.cancel();
        setFollowUp('');
        if (active !== undefined && previous === undefined) {
          setRendered(true);
          queueMicrotask(() => {
            const el = shell();
            if (!el || prefersReducedMotion()) return;
            running = el.animate(
              [
                { height: '0px', opacity: 0, transform: 'translateY(-8px)' },
                {
                  height: `${el.scrollHeight}px`,
                  opacity: 1,
                  transform: 'none',
                },
              ],
              { duration: OPEN_MS, easing: EASE }
            );
            const inner = body();
            if (inner) staggerRows(inner);
          });
          return;
        }
        if (active === undefined && previous !== undefined) {
          const el = shell();
          if (!el || prefersReducedMotion()) {
            setRendered(false);
            return;
          }
          running = el.animate(
            [
              { height: `${el.offsetHeight}px`, opacity: 1, transform: 'none' },
              { height: '0px', opacity: 0, transform: 'translateY(-8px)' },
            ],
            { duration: 240, easing: EASE }
          );
          running.onfinish = () => setRendered(false);
          return;
        }
        // Switching questions: keep the panel open and settle to the new size.
        const el = shell();
        const from = el?.offsetHeight ?? 0;
        queueMicrotask(() => {
          const panel = shell();
          const inner = body();
          if (!panel || !inner || prefersReducedMotion()) return;
          running = panel.animate(
            [{ height: `${from}px` }, { height: `${panel.scrollHeight}px` }],
            { duration: 260, easing: EASE }
          );
          inner.animate([{ opacity: 0.2 }, { opacity: 1 }], {
            duration: 220,
            easing: EASE,
          });
          staggerRows(inner);
        });
      },
      { defer: true }
    )
  );
  onCleanup(() => running?.cancel());

  const send = () => {
    const q = question();
    if (!q) return;
    const extra = followUp().trim();
    props.onAsk(extra ? `${q.prompt}\n\nFollow-up: ${extra}` : q.prompt);
  };

  return (
    <div class="flex flex-col gap-2">
      <form
        role="search"
        class="flex h-11 items-center gap-2 rounded-xl border border-edge-muted bg-panel px-3 transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-bg)] motion-reduce:transition-none"
        onSubmit={(event) => {
          event.preventDefault();
          const text = query().trim();
          if (!text) return;
          props.onSearch(text);
          setQuery('');
        }}
      >
        <SparkleIcon class="size-4 shrink-0 text-accent-ink" />
        <label class="min-w-0 flex-1">
          <span class="sr-only">Ask about your portfolio</span>
          <input
            type="search"
            autocomplete="off"
            enterkeyhint="send"
            placeholder="Ask anything about your portfolio, e.g. “why am I down today?”"
            class="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
        </label>
        <kbd class="hidden shrink-0 rounded border border-edge-muted px-1.5 text-[10px] text-ink-muted sm:inline">
          Enter
        </kbd>
      </form>
      <div
        role="group"
        aria-label="Suggested questions"
        class="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]"
      >
        <For each={props.questions}>
          {(q) => {
            const selected = () => props.active === q.id;
            return (
              <Button
                variant="accent"
                size="sm"
                aria-pressed={selected()}
                aria-expanded={selected()}
                aria-controls="portfolio-ask-panel"
                class={cn(
                  'shrink-0 gap-1.5 transition-[box-shadow,transform] duration-200 motion-reduce:transition-none',
                  selected() && 'ring-1 ring-accent'
                )}
                onClick={() => props.onSelect(selected() ? undefined : q.id)}
              >
                <SparkleIcon
                  class={cn(
                    'size-3.5 transition-transform duration-300 motion-reduce:transition-none',
                    selected() && 'rotate-45 scale-110'
                  )}
                />
                {q.label}
              </Button>
            );
          }}
        </For>
      </div>

      <Show when={rendered()}>
        <div
          ref={setShell}
          id="portfolio-ask-panel"
          class="overflow-hidden will-change-[height,opacity,transform]"
        >
          <section
            aria-label={question()?.label ?? 'Answer'}
            class="flex flex-col gap-3 rounded-xl border border-edge-muted bg-panel p-4"
          >
            <header class="flex items-center gap-2">
              <span class="inline-flex size-6 items-center justify-center rounded-full bg-accent-bg text-accent-ink">
                <SparkleIcon class="size-3.5" />
              </span>
              <h2 class="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {question()?.label}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close answer"
                onClick={() => props.onSelect(undefined)}
              >
                <XIcon />
              </Button>
            </header>

            <div ref={setBody} class="flex min-w-0 flex-col gap-2">
              {props.answer}
            </div>

            <form
              class="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <label class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-edge-muted bg-input px-3 focus-within:border-accent">
                <span class="sr-only">Ask a follow-up</span>
                <input
                  type="text"
                  autocomplete="off"
                  placeholder="Ask a follow-up about this…"
                  class="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
                  value={followUp()}
                  onInput={(e) => setFollowUp(e.currentTarget.value)}
                />
              </label>
              <Button
                type="submit"
                variant="cta"
                size="sm"
                class="shrink-0 gap-1.5"
              >
                <SparkleIcon class="size-3.5" />
                Ask Fintail AI
              </Button>
            </form>
            <p class="text-[11px] text-ink-extra-muted">
              Figures computed from your accounts. The AI explains them; it
              never recommends buying or selling.
            </p>
          </section>
        </div>
      </Show>
    </div>
  );
}
