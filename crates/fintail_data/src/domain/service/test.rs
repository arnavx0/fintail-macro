use super::*;
use crate::domain::models::AlertKind;
use crate::outbound::sample::SampleDataSource;

fn service() -> FintailService<SampleDataSource> {
    FintailService::new(SampleDataSource)
}

/// Words that would turn information into a recommendation.
const ADVICE: &[&str] = &["buy", "sell", "should", "recommend", "target price"];

#[tokio::test]
async fn alerts_link_news_to_held_positions_and_classify_the_move() {
    let alerts = service().alerts("user").await.expect("alerts");
    let kind = |symbol: &str| alerts.iter().find(|a| a.symbol == symbol).map(|a| a.kind);
    // NVDA +1.9%, ETH −1.9%, AAPL −0.3% in the sample market.
    assert_eq!(kind("NVDA"), Some(AlertKind::Gain));
    assert_eq!(kind("ETH"), Some(AlertKind::Loss));
    assert_eq!(kind("AAPL"), Some(AlertKind::Watch));
    // Not held: no alert, even though there is news.
    assert_eq!(kind("NFLX"), None);
    for alert in &alerts {
        let text = format!("{} {}", alert.title, alert.body).to_lowercase();
        for word in ADVICE {
            assert!(!text.contains(word), "{} contains {word}: {text}", alert.id);
        }
        assert!(alert.position_change.is_some());
    }
}

#[tokio::test]
async fn the_summary_and_holdings_agree() {
    let svc = service();
    let summary = svc.portfolio_summary("user", &[]).await.expect("summary");
    let holdings = svc.holdings("user", &[], None).await.expect("holdings");
    let total: f64 = holdings.iter().map(|h| h.value).sum();
    assert!((summary.totals.value - total).abs() < 1e-6);
    assert_eq!(summary.platforms.len(), 4);
}

#[tokio::test]
async fn filtering_by_platform_narrows_every_figure() {
    let svc = service();
    let crypto = vec!["coinbase".to_owned(), "binance".to_owned()];
    let summary = svc
        .portfolio_summary("user", &crypto)
        .await
        .expect("summary");
    assert!(
        summary
            .by_asset_class
            .iter()
            .all(|s| s.label == "Crypto" || s.label == "Cash")
    );
    let perf = svc
        .performance("user", &crypto, Range::Year)
        .await
        .expect("performance");
    assert!(perf.volatility > 0.0);
}

#[tokio::test]
async fn search_ranks_the_exact_ticker_first() {
    let results = service().search("nvda", 3).await.expect("search");
    assert_eq!(results.first().map(|i| i.symbol.as_str()), Some("NVDA"));
}

#[test]
fn money_reads_with_separators_and_cents() {
    assert_eq!(format_money(10_252.4), "$10,252.40");
    assert_eq!(format_money(192.5), "$192.50");
    assert_eq!(format_money(1_234_567.0), "$1,234,567.00");
}
