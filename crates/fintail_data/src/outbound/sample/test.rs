use super::*;
use crate::domain::metrics::{daily_returns, totals};

#[test]
fn the_generator_matches_the_web_app_bit_for_bit() {
    // Reference values from the web app's seededRandom(1) and
    // seedFromString('AAPL').
    assert_eq!(SeededRandom(1).next(), 0.627_073_940_588_161_3);
    assert_eq!(seed_from_str("AAPL"), 1_489_842_955);
    let normal = SeededRandom(seed_from_str("AAPL")).normal();
    assert!(
        (normal - -2.117_656_528_458_200_5).abs() < 1e-12,
        "{normal}"
    );
}

#[test]
fn every_series_lands_on_its_quote() {
    let market = sample_market();
    for i in &market.instruments {
        let (_, daily) = market
            .daily
            .iter()
            .find(|(s, _)| *s == i.symbol)
            .expect("series");
        assert_eq!(daily.last().map(|p| p.price), Some(i.price));
        assert_eq!(daily[daily.len() - 2].price, i.previous_close);
        assert!(i.week52_low <= i.price && i.price <= i.week52_high);
    }
}

#[test]
fn platform_histories_end_at_holdings_value_and_todays_move() {
    let market = sample_market();
    let portfolio = sample_portfolio(&market);
    for (id, history) in &portfolio.history {
        let mine: Vec<_> = portfolio
            .holdings
            .iter()
            .filter(|h| &h.platform_id == id)
            .collect();
        let today = totals(&mine);
        let last = history.last().expect("history");
        assert!((last.value - today.value).abs() < 1e-6, "{id}");
        let move_today = *daily_returns(history).last().expect("returns");
        assert!((move_today - today.day_change_pct).abs() < 1e-10, "{id}");
        assert!(history.iter().all(|p| p.value > 0.0), "{id}");
    }
}

#[test]
fn holdings_are_priced_from_the_market() {
    let market = sample_market();
    let portfolio = sample_portfolio(&market);
    let nvda = portfolio
        .holdings
        .iter()
        .find(|h| h.symbol == "NVDA")
        .expect("NVDA");
    let quote = market
        .instruments
        .iter()
        .find(|i| i.symbol == "NVDA")
        .expect("quote");
    assert_eq!(nvda.price, quote.price);
}
