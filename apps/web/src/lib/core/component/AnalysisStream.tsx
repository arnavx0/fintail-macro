import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
} from 'solid-js';

/** One titled paragraph of an analysis. */
export type AnalysisSection = { title: string; body: string };

const WORDS_PER_SECOND = 70;
const THINKING_MS = 450;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * An analysis that appears the way a live AI reply does: a short "Analysing"
 * beat, then each section streaming in word by word. Assistive tech gets the
 * whole text at once; reduced motion shows it immediately.
 */
export function AnalysisStream(props: {
  sections: readonly AnalysisSection[];
  /** Restart the stream when this changes (a new question or instrument). */
  streamKey: string;
}) {
  const words = createMemo(() =>
    props.sections.map((section) => section.body.split(/(\s+)/))
  );
  /** Where each section starts in the token stream, computed once per analysis. */
  const offsets = createMemo(() => {
    let running = 0;
    return words().map((parts) => {
      const start = running;
      running += parts.length;
      return start;
    });
  });
  const total = createMemo(() =>
    words().reduce((sum, parts) => sum + parts.length, 0)
  );
  const [shown, setShown] = createSignal(0);
  const [thinking, setThinking] = createSignal(true);
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Imperative timing over requestAnimationFrame; the text itself is derived.
  createEffect(
    on(
      () => props.streamKey,
      () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        if (prefersReducedMotion()) {
          setThinking(false);
          setShown(total());
          return;
        }
        setThinking(true);
        setShown(0);
        timer = setTimeout(() => {
          setThinking(false);
          const start = performance.now();
          const step = (now: number) => {
            // Whitespace tokens count too, so double the word rate.
            const next = Math.min(
              total(),
              Math.floor(((now - start) / 1000) * WORDS_PER_SECOND * 2)
            );
            setShown(next);
            if (next < total()) frame = requestAnimationFrame(step);
          };
          frame = requestAnimationFrame(step);
        }, THINKING_MS);
      }
    )
  );
  onCleanup(() => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  });

  /** How many tokens of section `index` are visible. */
  const visible = (index: number) =>
    Math.max(0, Math.min(words()[index].length, shown() - offsets()[index]));
  const streaming = () => !thinking() && shown() < total();
  /** The section currently being written, which carries the cursor. */
  const writing = (index: number) =>
    streaming() && visible(index) > 0 && visible(index) < words()[index].length;

  return (
    <div class="flex flex-col gap-3">
      <div class="sr-only" aria-live="polite">
        {thinking()
          ? 'Analysing'
          : props.sections.map((s) => `${s.title}. ${s.body}`).join(' ')}
      </div>
      <Show
        when={!thinking()}
        fallback={
          <div aria-hidden="true" class="flex flex-col gap-2">
            <span class="h-3 w-24 animate-pulse rounded bg-surface-3" />
            <span class="h-3 w-full animate-pulse rounded bg-surface-3" />
            <span class="h-3 w-4/5 animate-pulse rounded bg-surface-3" />
          </div>
        }
      >
        <div aria-hidden="true" class="flex flex-col gap-3">
          <For each={props.sections}>
            {(section, index) => (
              <Show when={visible(index()) > 0}>
                <div class="flex flex-col gap-0.5">
                  <h3 class="text-xs font-medium text-ink">{section.title}</h3>
                  <p class="text-sm leading-relaxed text-ink-muted">
                    {words()[index()].slice(0, visible(index())).join('')}
                    <Show when={writing(index())}>
                      <span class="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-accent" />
                    </Show>
                  </p>
                </div>
              </Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
