import { describe, expect, it } from 'vitest';
import { sampleMarkets } from '../queries/sample-markets';
import { formatChange, formatPrice } from './format';
import {
  change,
  movers,
  rangePosition,
  search,
  sectorPerformance,
  seriesFor,
} from './market-metrics';
import { GICS_SECTORS, GROUPS, type Instrument } from './types';

const instrument = (overrides: Partial<Instrument>): Instrument => ({
  symbol: 'AAA',
  name: 'Alpha',
  assetClass: 'Stocks',
  group: 'Information Technology',
  unit: 'currency',
  currency: 'USD',
  market: 'US',
  price: 110,
  previousClose: 100,
  dayHigh: 111,
  dayLow: 99,
  week52High: 150,
  week52Low: 50,
  ...overrides,
});

describe('market metrics', () => {
  it('measures change and the 52-week position', () => {
    expect(change(instrument({})).share).toBeCloseTo(0.1, 10);
    expect(rangePosition(instrument({}))).toBeCloseTo(0.6, 10);
  });

  it('weights sector moves by market capitalisation', () => {
    const sectors = sectorPerformance(
      [
        instrument({
          symbol: 'BIG',
          marketCap: 300,
          price: 101,
          previousClose: 100,
        }),
        instrument({
          symbol: 'SMALL',
          marketCap: 100,
          price: 90,
          previousClose: 100,
        }),
      ],
      ['Information Technology']
    );
    // (300 × 1% + 100 × −10%) / 400 = −1.75%
    expect(sectors[0].share).toBeCloseTo(-0.0175, 10);
  });

  it('ranks exact symbols, then prefixes, then names', () => {
    const results = search(
      [
        instrument({ symbol: 'APLD', name: 'Applied Digital' }),
        instrument({ symbol: 'AAPL', name: 'Apple' }),
        instrument({ symbol: 'PINE', name: 'Pineapple Corp' }),
      ],
      'aapl'
    );
    expect(results.map((i) => i.symbol)).toEqual(['AAPL']);
    expect(
      search([instrument({ symbol: 'MSFT', name: 'Microsoft' })], 'micro').map(
        (i) => i.symbol
      )
    ).toEqual(['MSFT']);
  });

  it('formats prices and yields as markets quote them', () => {
    const yieldQuote = instrument({
      unit: 'yield',
      price: 4.02,
      previousClose: 4.05,
    });
    expect(formatPrice(yieldQuote)).toBe('4.02%');
    expect(formatChange(yieldQuote, -0.03, -0.0074)).toBe('−3 bp');
    expect(
      formatPrice(instrument({ unit: 'rate', symbol: 'USD/JPY', price: 150.8 }))
    ).toMatch(/150\.80$/);
  });
});

describe('sample market', () => {
  const market = sampleMarkets();

  it('lands every series on its quote and previous close', () => {
    for (const i of market.instruments) {
      const daily = market.daily[i.symbol];
      expect(daily.at(-1)?.price).toBe(i.price);
      expect(daily.at(-2)?.price).toBe(i.previousClose);
      expect(market.intraday[i.symbol].at(-1)?.price).toBe(i.price);
      expect(i.week52Low).toBeLessThanOrEqual(i.price);
      expect(i.week52High).toBeGreaterThanOrEqual(i.price);
    }
  });

  it('classifies every instrument into a known group', () => {
    for (const i of market.instruments) {
      expect(GROUPS[i.assetClass]).toContain(i.group);
    }
    const stocks = market.instruments.filter((i) => i.assetClass === 'Stocks');
    expect(new Set(stocks.map((i) => i.group))).toEqual(new Set(GICS_SECTORS));
  });

  it('has gainers and losers, and charts for every range', () => {
    const m = movers(market.instruments);
    expect(m.gainers.length).toBeGreaterThan(0);
    expect(m.losers.length).toBeGreaterThan(0);
    expect(seriesFor(market, 'SPX', '1Y').length).toBe(253);
    expect(seriesFor(market, 'SPX', '1D').length).toBe(79);
  });
});
