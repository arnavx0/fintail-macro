import { render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { expect, it } from 'vitest';
import { AnimatedNumber } from './AnimatedNumber';

const format = (v: number) => `$${v.toFixed(2)}`;

it('gives assistive tech the final value while the visible figure animates', () => {
  const [value, setValue] = createSignal(100);
  render(() => <AnimatedNumber value={value()} format={format} />);
  expect(screen.getByText('$100.00', { selector: '.sr-only' })).toBeTruthy();
  setValue(250);
  expect(screen.getByText('$250.00', { selector: '.sr-only' })).toBeTruthy();
});
