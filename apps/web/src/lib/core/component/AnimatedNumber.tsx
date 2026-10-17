import { createEffect, createSignal, on, onCleanup } from 'solid-js';

const DURATION_MS = 600;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Fast start, gentle landing, so a changing figure reads as settling. */
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts from its previous value to the new one when it
 * changes, formatted on every frame. Jumps straight to the value when the
 * reader asks for reduced motion. The full value is always exposed to
 * assistive tech, never the in-between frames.
 */
export function AnimatedNumber(props: {
  value: number;
  format: (value: number) => string;
  class?: string;
}) {
  const [shown, setShown] = createSignal(props.value);
  let frame = 0;

  // Imperative animation over requestAnimationFrame; the target itself is
  // never derived here, only the frames on the way to it.
  createEffect(
    on(
      () => props.value,
      (target) => {
        cancelAnimationFrame(frame);
        const from = shown();
        if (from === target || prefersReducedMotion()) {
          setShown(target);
          return;
        }
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          setShown(from + (target - from) * easeOutCubic(t));
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { defer: true }
    )
  );
  onCleanup(() => cancelAnimationFrame(frame));

  return (
    <span class={props.class}>
      <span aria-hidden="true">{props.format(shown())}</span>
      <span class="sr-only">{props.format(props.value)}</span>
    </span>
  );
}
