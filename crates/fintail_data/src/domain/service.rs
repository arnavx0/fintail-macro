//! Read-only use cases over the user's portfolio, the market and the news.

#[cfg(test)]
mod test;

use serde::Serialize;

use super::metrics::{
    self, Income, MergedHolding, Range, Slice, Totals, annualised_volatility, combine_history,
    daily_returns, max_drawdown, money_weighted_return, range_start, time_weighted_return,
};
use super::models::{
    Alert, AlertKind, Instrument, MarketSnapshot, NewsItem, PortfolioSnapshot, PricePoint,
    ValuePoint,
};
use super::ports::{FintailDataError, FintailDataSource};

/// A move smaller than this (as a share) makes an alert a WATCH, not a GAIN or LOSS.
const ALERT_MOVE_THRESHOLD: f64 = 0.01;

/// Where the portfolio stands for the selected platforms.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct PortfolioSummary {
    /// ISO currency of every value.
    pub currency: String,
    /// Platforms included.
    pub platforms: Vec<String>,
    /// Value, today's change and gain on cost.
    pub totals: Totals,
    /// Allocation by asset class.
    pub by_asset_class: Vec<Slice>,
    /// Allocation by sector.
    pub by_sector: Vec<Slice>,
    /// The largest positions.
    pub top_holdings: Vec<MergedHolding>,
    /// Concentration warnings.
    pub warnings: Vec<String>,
    /// Dividend income.
    pub income: Income,
}

/// Returns and risk over a range, against the S&P 500.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct Performance {
    /// Money-weighted return: what the investor experienced.
    pub money_weighted_return: f64,
    /// Time-weighted return: performance independent of deposits.
    pub time_weighted_return: f64,
    /// The S&P 500's return over the same range.
    pub benchmark_return: f64,
    /// Change in value after removing deposits and withdrawals.
    pub investment_gain: f64,
    /// Deposits minus withdrawals in the range.
    pub net_deposits: f64,
    /// Annualised volatility of daily returns.
    pub volatility: f64,
    /// Largest fall from a peak, as a negative share.
    pub max_drawdown: f64,
}

/// The market at a glance.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct MarketOverview {
    /// Major indices.
    pub indices: Vec<Instrument>,
    /// Today's market-cap-weighted move per stock sector.
    pub sector_moves: Vec<(String, f64)>,
    /// Biggest stock gainers today.
    pub gainers: Vec<Instrument>,
    /// Biggest stock losers today.
    pub losers: Vec<Instrument>,
}

/// Read-only access to the user's investor data, with every figure computed
/// here rather than by the model.
pub struct FintailService<S: FintailDataSource> {
    source: S,
}

impl<S: FintailDataSource> FintailService<S> {
    /// Create the service over a data source.
    pub fn new(source: S) -> Self {
        Self { source }
    }

    /// Totals, allocation, top holdings, concentration and income for the
    /// selected platforms (all when `platforms` is empty).
    pub async fn portfolio_summary(
        &self,
        user_id: &str,
        platforms: &[String],
    ) -> Result<PortfolioSummary, FintailDataError> {
        let portfolio = self.source.portfolio(user_id).await?;
        let holdings = selected_holdings(&portfolio, platforms);
        let dividends: Vec<_> = portfolio
            .upcoming_dividends
            .iter()
            .filter(|d| platforms.is_empty() || platforms.contains(&d.platform_id))
            .collect();
        let mut top_holdings = metrics::merge_holdings(&holdings);
        top_holdings.truncate(5);
        Ok(PortfolioSummary {
            currency: portfolio.base_currency.clone(),
            platforms: portfolio
                .platforms
                .iter()
                .filter(|p| platforms.is_empty() || platforms.contains(&p.id))
                .map(|p| p.name.clone())
                .collect(),
            totals: metrics::totals(&holdings),
            by_asset_class: metrics::allocation(&holdings, |h| h.asset_class.clone()),
            by_sector: metrics::allocation(&holdings, |h| h.sector.clone()),
            top_holdings,
            warnings: metrics::concentration_warnings(&holdings),
            income: metrics::income(&holdings, &dividends),
        })
    }

    /// Every holding, merged across platforms, optionally filtered.
    pub async fn holdings(
        &self,
        user_id: &str,
        platforms: &[String],
        symbol: Option<&str>,
    ) -> Result<Vec<MergedHolding>, FintailDataError> {
        let portfolio = self.source.portfolio(user_id).await?;
        let holdings = selected_holdings(&portfolio, platforms);
        Ok(metrics::merge_holdings(&holdings)
            .into_iter()
            .filter(|h| symbol.is_none_or(|s| h.symbol.eq_ignore_ascii_case(s)))
            .collect())
    }

    /// Returns and risk over `range` for the selected platforms, against the S&P 500.
    pub async fn performance(
        &self,
        user_id: &str,
        platforms: &[String],
        range: Range,
    ) -> Result<Performance, FintailDataError> {
        let portfolio = self.source.portfolio(user_id).await?;
        let series: Vec<&[ValuePoint]> = portfolio
            .history
            .iter()
            .filter(|(id, _)| platforms.is_empty() || platforms.contains(id))
            .map(|(_, points)| points.as_slice())
            .collect();
        let combined = combine_history(&series);
        let points = &combined[range_start(combined.iter().map(|p| p.date), range)..];
        let market = self.source.market().await?;
        let spx = daily_for(&market, "SPX");
        let spx = &spx[range_start(spx.iter().map(|p| p.date), range)..];
        let deposits: f64 = points.iter().skip(1).map(|p| p.net_flow).sum();
        let gain = match (points.first(), points.last()) {
            (Some(first), Some(last)) => last.value - first.value - deposits,
            _ => 0.0,
        };
        Ok(Performance {
            money_weighted_return: money_weighted_return(points),
            time_weighted_return: time_weighted_return(points),
            benchmark_return: time_weighted_return(&metrics::price_points_as_values(spx)),
            investment_gain: gain,
            net_deposits: deposits,
            volatility: annualised_volatility(&daily_returns(points)),
            max_drawdown: max_drawdown(points),
        })
    }

    /// Latest quotes for the given symbols, in the order asked.
    pub async fn quotes(&self, symbols: &[String]) -> Result<Vec<Instrument>, FintailDataError> {
        let market = self.source.market().await?;
        Ok(symbols
            .iter()
            .filter_map(|s| {
                market
                    .instruments
                    .iter()
                    .find(|i| i.symbol.eq_ignore_ascii_case(s))
                    .cloned()
            })
            .collect())
    }

    /// Instruments matching a ticker or name.
    pub async fn search(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<Instrument>, FintailDataError> {
        let market = self.source.market().await?;
        Ok(metrics::search(&market.instruments, query)
            .into_iter()
            .take(limit)
            .cloned()
            .collect())
    }

    /// Indices, sector moves and the day's movers.
    pub async fn market_overview(&self) -> Result<MarketOverview, FintailDataError> {
        let market = self.source.market().await?;
        let mut stocks: Vec<&Instrument> = market
            .instruments
            .iter()
            .filter(|i| i.asset_class == "Stocks")
            .collect();
        stocks.sort_by(|a, b| metrics::change(b).1.total_cmp(&metrics::change(a).1));
        Ok(MarketOverview {
            indices: market
                .instruments
                .iter()
                .filter(|i| i.asset_class == "Indices")
                .cloned()
                .collect(),
            sector_moves: metrics::sector_moves(&market.instruments),
            gainers: stocks.iter().take(5).map(|i| (*i).clone()).collect(),
            losers: stocks.iter().rev().take(5).map(|i| (*i).clone()).collect(),
        })
    }

    /// Daily closes for a symbol over `range`.
    pub async fn price_history(
        &self,
        symbol: &str,
        range: Range,
    ) -> Result<Vec<PricePoint>, FintailDataError> {
        let market = self.source.market().await?;
        let daily = daily_for(&market, symbol);
        Ok(daily[range_start(daily.iter().map(|p| p.date), range)..].to_vec())
    }

    /// Recent news, optionally about specific symbols.
    pub async fn news(&self, symbols: &[String]) -> Result<Vec<NewsItem>, FintailDataError> {
        let news = self.source.news().await?;
        Ok(news
            .into_iter()
            .filter(|n| {
                symbols.is_empty()
                    || n.symbols
                        .iter()
                        .any(|s| symbols.iter().any(|q| q.eq_ignore_ascii_case(s)))
            })
            .collect())
    }

    /// The autonomous analysis: link each news item about something the user
    /// holds to the instrument's move and the user's position, and classify it
    /// as a GAIN, LOSS or WATCH. Every figure is computed here.
    pub async fn alerts(&self, user_id: &str) -> Result<Vec<Alert>, FintailDataError> {
        let portfolio = self.source.portfolio(user_id).await?;
        let market = self.source.market().await?;
        let news = self.source.news().await?;
        let all: Vec<_> = portfolio.holdings.iter().collect();
        let merged = metrics::merge_holdings(&all);
        let mut alerts = Vec::new();
        for item in &news {
            for symbol in &item.symbols {
                let Some(holding) = merged.iter().find(|h| &h.symbol == symbol) else {
                    continue;
                };
                let Some(quote) = market.instruments.iter().find(|i| &i.symbol == symbol) else {
                    continue;
                };
                let (_, share) = metrics::change(quote);
                let kind = if share >= ALERT_MOVE_THRESHOLD {
                    AlertKind::Gain
                } else if share <= -ALERT_MOVE_THRESHOLD {
                    AlertKind::Loss
                } else {
                    AlertKind::Watch
                };
                let platforms = holding
                    .platform_ids
                    .iter()
                    .filter_map(|id| portfolio.platforms.iter().find(|p| &p.id == id))
                    .map(|p| p.name.as_str())
                    .collect::<Vec<_>>()
                    .join(" and ");
                let direction = if share >= 0.0 { "up" } else { "down" };
                let title = match kind {
                    AlertKind::Gain => format!("{symbol} up {:.1}% on the news", share * 100.0),
                    AlertKind::Loss => format!("{symbol} down {:.1}% on the news", -share * 100.0),
                    AlertKind::Watch => format!("{symbol}: news on a holding"),
                };
                let body = format!(
                    "{}. {symbol} is {direction} {:.1}% today. Your {} {symbol} on {platforms} {} {} today and are worth {} ({}{:.1}% total).",
                    item.headline,
                    share.abs() * 100.0,
                    trim_quantity(holding.quantity),
                    if holding.day_change >= 0.0 {
                        "gained"
                    } else {
                        "lost"
                    },
                    format_money(holding.day_change.abs()),
                    format_money(holding.value),
                    if holding.unrealized_pct >= 0.0 {
                        "+"
                    } else {
                        "−"
                    },
                    holding.unrealized_pct.abs() * 100.0,
                );
                alerts.push(Alert {
                    id: format!("{}-{symbol}", item.id),
                    kind,
                    symbol: symbol.clone(),
                    title,
                    body,
                    news_id: item.id.clone(),
                    raised_at: item.published_at.clone(),
                    move_share: share,
                    position_change: Some(holding.day_change),
                });
            }
        }
        Ok(alerts)
    }
}

fn selected_holdings<'a>(
    portfolio: &'a PortfolioSnapshot,
    platforms: &[String],
) -> Vec<&'a super::models::Holding> {
    portfolio
        .holdings
        .iter()
        .filter(|h| platforms.is_empty() || platforms.contains(&h.platform_id))
        .collect()
}

fn daily_for<'a>(market: &'a MarketSnapshot, symbol: &str) -> &'a [PricePoint] {
    market
        .daily
        .iter()
        .find(|(s, _)| s.eq_ignore_ascii_case(symbol))
        .map_or(&[], |(_, points)| points.as_slice())
}

/// `$10,252.40`, with thousands separators and cents.
fn format_money(value: f64) -> String {
    let cents = (value * 100.0).round() as i64;
    let (whole, fraction) = (cents / 100, (cents % 100).abs());
    let digits = whole.abs().to_string();
    let mut grouped = String::new();
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(ch);
    }
    format!(
        "{}${grouped}.{fraction:02}",
        if whole < 0 { "-" } else { "" }
    )
}

fn trim_quantity(quantity: f64) -> String {
    let text = format!("{quantity:.4}");
    text.trim_end_matches('0').trim_end_matches('.').to_owned()
}
