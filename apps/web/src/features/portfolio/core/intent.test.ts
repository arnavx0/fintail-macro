import { expect, it } from 'vitest';
import { matchIntent } from './intent';

const held = ['NVDA', 'AAPL', 'O', 'BTC'];

it.each([
  ['Why am I down today?', { kind: 'today' }],
  ['how diversified am i', { kind: 'diversified' }],
  ['Am I beating the S&P 500?', { kind: 'benchmark' }],
  ['when are my next dividends', { kind: 'income' }],
  ['how is NVDA doing', { kind: 'holding', symbol: 'NVDA' }],
  ['why is btc down today', { kind: 'holding', symbol: 'BTC' }],
  [
    'what should I research next about the semiconductor cycle',
    { kind: 'open' },
  ],
])('classifies %j', (query, intent) => {
  expect(matchIntent(query, held)).toEqual(intent);
});

it('does not mistake a letter inside a word for a ticker', () => {
  // "O" (Realty Income) must not match the "o" in "how" or "doing".
  expect(matchIntent('how am I doing overall', held)).toEqual({ kind: 'open' });
});
