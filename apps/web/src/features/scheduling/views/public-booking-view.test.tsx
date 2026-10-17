import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, expect, it } from 'vitest';
import type { PublicProfile } from '../core/types';
import type { BookingSource } from '../primitives/booking-flow';
import { PublicBookingView } from './public-booking-view';

const profile: PublicProfile = {
  id: 'team',
  name: 'Fintail',
  description: 'Meet the team.',
  eventTypes: [],
};

function renderPage(embedded?: boolean) {
  render(() => (
    <PublicBookingView
      profile={profile}
      source={{} as BookingSource}
      onEvent={() => {}}
      onReceipt={() => {}}
      embedded={embedded}
    />
  ));
}

afterEach(cleanup);

it('carries the Fintail name when it is the whole page', () => {
  renderPage();

  expect(
    screen.getByRole('link', { name: /Fintail\s*Scheduling/ })
  ).toBeTruthy();
  expect(screen.getByText('Scheduling by Fintail')).toBeTruthy();
});

it('leaves the Fintail name to the page that embeds it', () => {
  renderPage(true);

  expect(screen.getByRole('heading', { name: 'Fintail' })).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByText('Scheduling by Fintail')).toBeNull();
});
