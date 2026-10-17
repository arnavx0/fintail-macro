import { type Accessor, createContext, type JSX, useContext } from 'solid-js';
import type { PortfolioSnapshot } from '../core/types';

/**
 * What the Portfolio section reads, whatever the data comes from. The app
 * entry point supplies it: today an illustrative sample, later connected
 * brokers (SnapTrade) and a licensed market-data provider.
 */
export type PortfolioSource = {
  snapshot: Accessor<PortfolioSnapshot | undefined>;
  /** True while the numbers are the illustrative sample, not the user's accounts. */
  isSample: Accessor<boolean>;
};

const PortfolioContext = createContext<PortfolioSource>();

export function PortfolioProvider(props: {
  source: PortfolioSource;
  children: JSX.Element;
}) {
  return (
    <PortfolioContext.Provider value={props.source}>
      {props.children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioSource(): PortfolioSource {
  const source = useContext(PortfolioContext);
  if (!source) {
    throw new Error('usePortfolioSource needs a PortfolioProvider above it');
  }
  return source;
}
