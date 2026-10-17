import type { JSX } from 'solid-js';

const MACRO_MARK_PATHS = [
  'M3 21.1C3 19.1 3.7 17.3 5.2 16.3C6.07 15.75 6.87 15.08 7.6 14.33V21.6H3.5C3.2 21.6 3 21.4 3 21.1Z',
  'M9.1 12.64C10.73 10.84 12.22 8.83 13.7 6.8V18.03C12.12 18.66 10.62 19.57 9.2 20.8L9.1 20.88Z',
  'M15.2 4.73C16.95 2.81 19.07 1.92 21.7 1.5Q14.6 9.6 21.7 17.6C19.53 17.25 17.36 17.39 15.2 17.95Z',
] as const;

// The three pieces of the Fintail mark — the rising bars that form the
// tailfin — split apart horizontally when the header logo link is hovered.
export function MacroMarkIcon(props: {
  style?: JSX.CSSProperties;
  class?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="2.5 1 19.7 21.1"
      fill="currentColor"
      aria-hidden="true"
      class={props.class}
      style={props.style}
    >
      <style>{`
        .macro-mark-part {
          transform-box: fill-box;
          transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .macro-mark-left { transform-origin: 85% 50%; }
        .macro-mark-mid { transform-origin: center; }
        .macro-mark-right { transform-origin: 15% 50%; }
        @media (hover) {
          .base-header-logo:hover .macro-mark-left {
            transform: translateX(-1.2px) scale(1.06);
          }
          .base-header-logo:hover .macro-mark-mid {
            transform: scale(1.1);
          }
          .base-header-logo:hover .macro-mark-right {
            transform: translateX(1.2px) scale(1.06);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .macro-mark-part { transition: none; }
        }
      `}</style>
      <g class="macro-mark-part macro-mark-left">
        <path d={MACRO_MARK_PATHS[0]} />
      </g>
      <g class="macro-mark-part macro-mark-mid">
        <path d={MACRO_MARK_PATHS[1]} />
      </g>
      <g class="macro-mark-part macro-mark-right">
        <path d={MACRO_MARK_PATHS[2]} />
      </g>
    </svg>
  );
}
