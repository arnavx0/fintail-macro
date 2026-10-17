/** What a typed portfolio question is about, so it can be answered instantly. */
export type AskIntent =
  | { kind: 'today' }
  | { kind: 'diversified' }
  | { kind: 'benchmark' }
  | { kind: 'income' }
  | { kind: 'holding'; symbol: string }
  | { kind: 'open' };

const PATTERNS: {
  kind: 'today' | 'diversified' | 'benchmark' | 'income';
  words: RegExp;
}[] = [
  {
    kind: 'income',
    words: /\b(dividends?|income|yield|payouts?|pay dates?)\b/,
  },
  {
    kind: 'benchmark',
    words:
      /\b(s&p|sp ?500|benchmark|index|beat(ing)?|outperform\w*|underperform\w*)\b/,
  },
  {
    kind: 'diversified',
    words:
      /\b(diversi\w*|concentrat\w*|allocation|exposure|balanced|risk\w*|sectors?)\b/,
  },
  {
    kind: 'today',
    words:
      /\b(today|daily|why (am i|did i|is my)|move[ds]?|down|up|drop\w*|gain\w*|los[st]\w*)\b/,
  },
];

/**
 * Classify a question about the portfolio. A held ticker wins over a topic
 * ("why is NVDA down" is about NVDA); anything unrecognised goes to the AI.
 */
export function matchIntent(
  query: string,
  heldSymbols: readonly string[]
): AskIntent {
  const text = query.trim();
  if (!text) return { kind: 'open' };
  const upper = text.toUpperCase();
  const symbol = heldSymbols.find((s) =>
    new RegExp(
      `(^|[^A-Z0-9])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Z0-9])`
    ).test(upper)
  );
  if (symbol) return { kind: 'holding', symbol };
  const lower = text.toLowerCase();
  const topic = PATTERNS.find((p) => p.words.test(lower));
  return topic ? { kind: topic.kind } : { kind: 'open' };
}
