use chrono::NaiveDate;

use super::*;

fn holding(symbol: &str, quantity: f64, price: f64, previous_close: f64, cost: f64) -> Holding {
    Holding {
        platform_id: "robinhood".to_owned(),
        symbol: symbol.to_owned(),
        name: symbol.to_owned(),
        asset_class: "Stocks".to_owned(),
        sector: "Technology".to_owned(),
        region: "United States".to_owned(),
        quantity,
        price,
        previous_close,
        cost_basis: cost,
        dividends_ttm: 0.0,
        dividends_next_12m: 0.0,
    }
}

fn point(day: u32, value: f64, net_flow: f64) -> ValuePoint {
    ValuePoint {
        date: NaiveDate::from_ymd_opt(2026, 1, day).expect("valid test date"),
        value,
        net_flow,
    }
}

#[test]
fn totals_measure_today_against_the_previous_close() {
    let a = holding("AAPL", 10.0, 110.0, 100.0, 1000.0);
    let b = holding("BTC", 1.0, 50.0, 60.0, 40.0);
    let t = totals(&[&a, &b]);
    assert_eq!(t.value, 1150.0);
    assert_eq!(t.day_change, 90.0);
    assert!((t.day_change_pct - 90.0 / 1060.0).abs() < 1e-12);
    assert_eq!(t.unrealized, 110.0);
}

#[test]
fn a_deposit_is_not_a_gain() {
    let points = [point(1, 1000.0, 0.0), point(2, 2000.0, 1000.0)];
    assert!(time_weighted_return(&points).abs() < 1e-12);
    assert!(money_weighted_return(&points).abs() < 1e-12);
}

#[test]
fn modified_dietz_weights_a_mid_period_deposit() {
    let points = [
        point(1, 1000.0, 0.0),
        point(2, 2000.0, 1000.0),
        point(3, 2200.0, 0.0),
    ];
    assert!((money_weighted_return(&points) - 200.0 / 1500.0).abs() < 1e-12);
}

#[test]
fn drawdown_is_the_deepest_fall_from_a_peak() {
    let points = [
        point(1, 100.0, 0.0),
        point(2, 120.0, 0.0),
        point(3, 90.0, 0.0),
        point(4, 130.0, 0.0),
    ];
    assert!((max_drawdown(&points) - (90.0 / 120.0 - 1.0)).abs() < 1e-12);
}

#[test]
fn one_instrument_on_two_platforms_merges() {
    let a = holding("NVDA", 10.0, 100.0, 100.0, 800.0);
    let mut b = holding("NVDA", 5.0, 100.0, 100.0, 400.0);
    b.platform_id = "ibkr".to_owned();
    let merged = merge_holdings(&[&a, &b]);
    assert_eq!(merged.len(), 1);
    assert_eq!(merged[0].quantity, 15.0);
    assert_eq!(merged[0].platform_ids, ["robinhood", "ibkr"]);
}

#[test]
fn concentration_flags_a_dominant_position_and_sector() {
    let a = holding("NVDA", 30.0, 110.0, 100.0, 1000.0);
    let mut b = holding("JNJ", 10.0, 110.0, 100.0, 1000.0);
    b.sector = "Healthcare".to_owned();
    assert_eq!(
        concentration_warnings(&[&a, &b]),
        [
            "NVDA is 75% of your portfolio.",
            "Technology makes up 75% of your holdings."
        ]
    );
}
