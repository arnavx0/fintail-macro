import { type Accessor, createContext, type JSX, useContext } from 'solid-js';
import type { MarketSnapshot } from '../core/types';

/**
 * What Markets reads, whatever the data comes from: today an illustrative
 * sample, later a licensed market-data provider.
 */
export type MarketSource = {
  snapshot: Accessor<MarketSnapshot | undefined>;
  /** True while prices are the illustrative sample, not live quotes. */
  isSample: Accessor<boolean>;
};

const MarketsContext = createContext<MarketSource>();

export function MarketsProvider(props: {
  source: MarketSource;
  children: JSX.Element;
}) {
  return (
    <MarketsContext.Provider value={props.source}>
      {props.children}
    </MarketsContext.Provider>
  );
}

export function useMarketSource(): MarketSource {
  const source = useContext(MarketsContext);
  if (!source) {
    throw new Error('useMarketSource needs a MarketsProvider above it');
  }
  return source;
}
