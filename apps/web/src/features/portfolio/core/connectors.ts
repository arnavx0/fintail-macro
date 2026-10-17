/** A brokerage or exchange reachable through the SnapTrade MCP connector. */
export type Brokerage = {
  id: string;
  name: string;
  kind: 'brokerage' | 'crypto';
  region: string;
};

/**
 * Brokerages and exchanges SnapTrade connects read-only. The live list comes
 * from SnapTrade's brokerage directory once the connector is configured.
 */
export const BROKERAGES: readonly Brokerage[] = [
  { id: 'robinhood', name: 'Robinhood', kind: 'brokerage', region: 'US' },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    kind: 'brokerage',
    region: 'Global',
  },
  { id: 'schwab', name: 'Charles Schwab', kind: 'brokerage', region: 'US' },
  { id: 'fidelity', name: 'Fidelity', kind: 'brokerage', region: 'US' },
  { id: 'webull', name: 'Webull', kind: 'brokerage', region: 'US' },
  { id: 'moomoo', name: 'moomoo', kind: 'brokerage', region: 'SG · US' },
  { id: 'tiger', name: 'Tiger Brokers', kind: 'brokerage', region: 'SG' },
  {
    id: 'trading212',
    name: 'Trading 212',
    kind: 'brokerage',
    region: 'UK · EU',
  },
  { id: 'etoro', name: 'eToro', kind: 'brokerage', region: 'Global' },
  { id: 'saxo', name: 'Saxo', kind: 'brokerage', region: 'SG · EU' },
  { id: 'coinbase', name: 'Coinbase', kind: 'crypto', region: 'Global' },
  { id: 'binance', name: 'Binance', kind: 'crypto', region: 'Global' },
  { id: 'kraken', name: 'Kraken', kind: 'crypto', region: 'Global' },
  { id: 'okx', name: 'OKX', kind: 'crypto', region: 'Global' },
  { id: 'gemini', name: 'Gemini', kind: 'crypto', region: 'US' },
];

/** A data or productivity connector the agent can use as tools. */
export type Service = {
  id: string;
  name: string;
  description: string;
  via: 'Built in' | 'MCP' | 'Pipedream';
  group: 'Market data & research' | 'Documents & exports';
  /** On for everyone unless turned off. */
  defaultOn?: boolean;
};

export const SERVICES: readonly Service[] = [
  {
    id: 'market-data',
    name: 'Fintail Market Data',
    description:
      'Prices, charts and fundamentals for stocks, ETFs, forex and crypto.',
    via: 'Built in',
    group: 'Market data & research',
    defaultOn: true,
  },
  {
    id: 'edgar',
    name: 'SEC EDGAR',
    description: 'Company filings and insider trades for what you own.',
    via: 'MCP',
    group: 'Market data & research',
  },
  {
    id: 'fred',
    name: 'FRED economic data',
    description:
      'Rates, inflation and economic releases from the St. Louis Fed.',
    via: 'MCP',
    group: 'Market data & research',
  },
  {
    id: 'news',
    name: 'News & sentiment',
    description: 'Headlines tagged to your holdings, for alerts and briefs.',
    via: 'MCP',
    group: 'Market data & research',
    defaultOn: true,
  },
  {
    id: 'gmail',
    name: 'Gmail contract notes',
    description:
      'Reads broker contract notes and dividend notices from your inbox.',
    via: 'Pipedream',
    group: 'Documents & exports',
  },
  {
    id: 'sheets',
    name: 'Google Sheets',
    description: 'Exports holdings and performance to a spreadsheet you own.',
    via: 'Pipedream',
    group: 'Documents & exports',
  },
];

/** What the user has connected. Brokers only count while SnapTrade is on. */
export type ConnectionState = {
  snaptrade: boolean;
  brokers: string[];
  services: Record<string, boolean>;
};

export const INITIAL_CONNECTIONS: ConnectionState = {
  snaptrade: true,
  // The sample portfolio's platforms.
  brokers: ['robinhood', 'ibkr', 'coinbase', 'binance'],
  services: {},
};

export function serviceEnabled(state: ConnectionState, service: Service) {
  return state.services[service.id] ?? service.defaultOn ?? false;
}

/** How many connectors are live, for the button badge. */
export function connectedCount(state: ConnectionState) {
  const brokers = state.snaptrade ? state.brokers.length : 0;
  return brokers + SERVICES.filter((s) => serviceEnabled(state, s)).length;
}
