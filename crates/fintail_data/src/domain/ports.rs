//! The port Fintail's investor data comes through.

use std::future::Future;

use super::models::{MarketSnapshot, NewsItem, PortfolioSnapshot};

/// Why investor data could not be read.
#[derive(Debug, thiserror::Error)]
pub enum FintailDataError {
    /// The source (broker connector, market feed) is unavailable right now.
    #[error("investor data is unavailable: {0}")]
    Unavailable(String),
}

/// Where portfolios, quotes and news come from: the sample today, SnapTrade
/// and a licensed market feed later. Implementations must be read-only.
pub trait FintailDataSource: Send + Sync + 'static {
    /// The user's portfolio across every connected platform.
    fn portfolio(
        &self,
        user_id: &str,
    ) -> impl Future<Output = Result<PortfolioSnapshot, FintailDataError>> + Send;

    /// The covered market with daily history.
    fn market(&self) -> impl Future<Output = Result<MarketSnapshot, FintailDataError>> + Send;

    /// Recent news, newest first.
    fn news(&self) -> impl Future<Output = Result<Vec<NewsItem>, FintailDataError>> + Send;
}
