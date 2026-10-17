#![deny(missing_docs)]
//! Fintail's investor data: portfolios across brokers, public markets, news
//! and alerts, with the metrics computed from them, following the hexagonal
//! architecture pattern.
//!
//! # Architecture
//!
//! - **domain**: models, pure metrics, the data-source port and the service.
//! - **outbound**: data sources. Today a deterministic sample (the same
//!   numbers the web app shows); later SnapTrade and a licensed market feed.

pub mod domain;

#[cfg(feature = "outbound")]
pub mod outbound;
