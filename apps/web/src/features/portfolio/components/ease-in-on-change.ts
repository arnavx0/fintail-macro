import { type Accessor, createEffect, on } from 'solid-js';

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Ease an element's content in (a short fade and rise) whenever `key`
 * changes, so a filter or range change reads as the data updating rather
 * than a jump. Skipped for readers who ask for reduced motion.
 */
export function createEaseInOnChange(
  element: Accessor<HTMLElement | undefined>,
  key: Accessor<string | undefined>
) {
  // Imperative Web Animations call; nothing is derived here.
  createEffect(
    on(
      key,
      () => {
        const el = element();
        if (!el || prefersReducedMotion()) return;
        el.animate(
          [
            { opacity: 0.35, transform: 'translateY(4px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      },
      { defer: true }
    )
  );
}
