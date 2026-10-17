//! Investor data: portfolios, markets, news and alerts.

use serde::Serialize;

/// Where an account lives.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PlatformKind {
    /// A securities brokerage.
    Brokerage,
    /// A crypto exchange.
    Crypto,
}

/// A connected brokerage or crypto platform.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Platform {
    /// Stable id, e.g. `robinhood`.
    pub id: String,
    /// Display name.
    pub name: String,
    /// Brokerage or crypto exchange.
    pub kind: PlatformKind,
}

/// One position on one platform, valued in the portfolio's base currency.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Holding {
    /// The platform holding it.
    pub platform_id: String,
    /// Ticker or asset symbol.
    pub symbol: String,
    /// Instrument name.
    pub name: String,
    /// Stocks, ETFs, Crypto or Cash.
    pub asset_class: String,
    /// Sector, for allocation.
    pub sector: String,
    /// Region, for allocation.
    pub region: String,
    /// Units held.
    pub quantity: f64,
    /// Latest price.
    pub price: f64,
    /// Previous session's close.
    pub previous_close: f64,
    /// Total paid for the position.
    pub cost_basis: f64,
    /// Dividends received over the last twelve months.
    pub dividends_ttm: f64,
    /// Dividends expected over the next twelve months.
    pub dividends_next_12m: f64,
}

/// A day-end value of one platform's accounts; `net_flow` is money moved in (+) or out (-).
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct ValuePoint {
    /// `YYYY-MM-DD`.
    pub date: chrono::NaiveDate,
    /// Account value at the close.
    pub value: f64,
    /// Deposits minus withdrawals that day.
    pub net_flow: f64,
}

/// A dividend expected on a holding.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct UpcomingDividend {
    /// The paying instrument.
    pub symbol: String,
    /// The platform holding it.
    pub platform_id: String,
    /// Pay date.
    pub pay_date: chrono::NaiveDate,
    /// Expected amount in the base currency.
    pub amount: f64,
}

/// Everything known about a user's portfolio, in one base currency.
#[derive(Debug, Clone, PartialEq)]
pub struct PortfolioSnapshot {
    /// ISO currency code of every value.
    pub base_currency: String,
    /// Connected platforms.
    pub platforms: Vec<Platform>,
    /// Positions across those platforms.
    pub holdings: Vec<Holding>,
    /// Day-end values per platform id, oldest first, on the same dates.
    pub history: Vec<(String, Vec<ValuePoint>)>,
    /// Expected dividends.
    pub upcoming_dividends: Vec<UpcomingDividend>,
}

/// How a quote is shown.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum QuoteUnit {
    /// Money in `currency`.
    Currency,
    /// Index points.
    Points,
    /// An FX rate.
    Rate,
    /// A yield in percent.
    Yield,
}

/// A tradable or benchmark instrument with its latest quote.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Instrument {
    /// Ticker or pair, e.g. `AAPL`, `USD/SGD`.
    pub symbol: String,
    /// Name.
    pub name: String,
    /// Indices, Stocks, ETFs, Forex, Crypto, Commodities or Rates.
    pub asset_class: String,
    /// Region for indices, GICS sector for stocks, category elsewhere.
    pub group: String,
    /// How the price is quoted.
    pub unit: QuoteUnit,
    /// Quote currency.
    pub currency: String,
    /// Listing exchange, for stocks and ETFs.
    pub exchange: Option<String>,
    /// Latest price.
    pub price: f64,
    /// Previous close.
    pub previous_close: f64,
    /// Today's high.
    pub day_high: f64,
    /// Today's low.
    pub day_low: f64,
    /// 52-week high.
    pub week52_high: f64,
    /// 52-week low.
    pub week52_low: f64,
    /// Shares or units traded today, when it applies.
    pub volume: Option<f64>,
    /// Market capitalisation, when it applies.
    pub market_cap: Option<f64>,
    /// Price to earnings, when it applies.
    pub pe_ratio: Option<f64>,
    /// Dividend yield as a share, when it applies.
    pub dividend_yield: Option<f64>,
}

/// A dated close.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct PricePoint {
    /// Trading day.
    pub date: chrono::NaiveDate,
    /// Close.
    pub price: f64,
}

/// The market Fintail covers.
#[derive(Debug, Clone, PartialEq)]
pub struct MarketSnapshot {
    /// The trading day the quotes are for.
    pub as_of: chrono::NaiveDate,
    /// Every instrument with its quote.
    pub instruments: Vec<Instrument>,
    /// Daily closes per symbol, oldest first, ending at today's price.
    pub daily: Vec<(String, Vec<PricePoint>)>,
}

/// What a news item is about.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum NewsCategory {
    /// A single company.
    Company,
    /// Broad markets and sectors.
    Markets,
    /// Rates, inflation and the economy.
    Economy,
    /// Crypto assets.
    Crypto,
}

/// A headline with a short summary, tagged to the instruments it moves.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct NewsItem {
    /// Stable id.
    pub id: String,
    /// When it was published, RFC 3339.
    pub published_at: String,
    /// Publisher.
    pub source: String,
    /// Headline.
    pub headline: String,
    /// One- or two-sentence summary (never the full article).
    pub summary: String,
    /// Tickers it concerns.
    pub symbols: Vec<String>,
    /// Company, markets, economy or crypto.
    pub category: NewsCategory,
}

/// How an alert should read: the user's money went up, went down, or there is
/// something to watch. Deliberately not buy/sell advice.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum AlertKind {
    /// A holding or the portfolio is up because of the event.
    Gain,
    /// A holding or the portfolio is down.
    Loss,
    /// Relevant news without a significant price move yet.
    Watch,
}

/// An insight the autonomous analysis produced by linking news, prices and
/// the user's portfolio. Every number in it comes from code.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Alert {
    /// Stable id.
    pub id: String,
    /// Gain, loss or watch.
    pub kind: AlertKind,
    /// The instrument it concerns.
    pub symbol: String,
    /// One-line heading.
    pub title: String,
    /// The insight, with the figures behind it.
    pub body: String,
    /// The news item that triggered it.
    pub news_id: String,
    /// When it was raised, RFC 3339.
    pub raised_at: String,
    /// The instrument's move in the window, as a share.
    pub move_share: f64,
    /// The user's money gained or lost on it, when they hold it.
    pub position_change: Option<f64>,
}
