//! Pure portfolio and market metrics. The same formulas as the web app, so
//! the agent and the screens always agree.

#[cfg(test)]
mod test;

use std::collections::BTreeMap;

use chrono::{Datelike, Duration, NaiveDate};
use serde::Serialize;

use super::models::{Holding, Instrument, PricePoint, UpcomingDividend, ValuePoint};

/// Trading days per year, for annualising volatility.
const TRADING_DAYS: f64 = 252.0;
/// A single position above this share of the portfolio is a concentration risk.
pub const POSITION_CONCENTRATION: f64 = 0.2;
/// A single sector above this share of the portfolio is a concentration risk.
pub const SECTOR_CONCENTRATION: f64 = 0.4;
/// Allocation slices past this many fold into "Other".
const MAX_SLICES: usize = 6;

/// A chart or reporting range.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Range {
    /// Past week.
    Week,
    /// Past month.
    Month,
    /// Past three months.
    Quarter,
    /// Since the first trading day of the year.
    YearToDate,
    /// Past year.
    Year,
    /// All available history.
    All,
}

fn value_of(h: &Holding) -> f64 {
    h.quantity * h.price
}

/// Headline totals: value, today's change, and the gain on cost.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct Totals {
    /// Current value.
    pub value: f64,
    /// Change since the previous close.
    pub day_change: f64,
    /// That change as a share of the opening value.
    pub day_change_pct: f64,
    /// Total paid.
    pub cost: f64,
    /// Value minus cost.
    pub unrealized: f64,
    /// Unrealised gain as a share of cost.
    pub unrealized_pct: f64,
}

/// Totals for a set of holdings.
pub fn totals(holdings: &[&Holding]) -> Totals {
    let value: f64 = holdings.iter().map(|h| value_of(h)).sum();
    let day_change: f64 = holdings
        .iter()
        .map(|h| h.quantity * (h.price - h.previous_close))
        .sum();
    let cost: f64 = holdings.iter().map(|h| h.cost_basis).sum();
    let open = value - day_change;
    Totals {
        value,
        day_change,
        day_change_pct: if open == 0.0 { 0.0 } else { day_change / open },
        cost,
        unrealized: value - cost,
        unrealized_pct: if cost == 0.0 {
            0.0
        } else {
            (value - cost) / cost
        },
    }
}

/// One instrument across every platform that holds it.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct MergedHolding {
    /// Ticker.
    pub symbol: String,
    /// Name.
    pub name: String,
    /// Asset class.
    pub asset_class: String,
    /// Platforms holding it, in first-seen order.
    pub platform_ids: Vec<String>,
    /// Units across platforms.
    pub quantity: f64,
    /// Latest price.
    pub price: f64,
    /// Current value.
    pub value: f64,
    /// Share of the selected portfolio.
    pub weight: f64,
    /// Money moved today.
    pub day_change: f64,
    /// Today's move as a share.
    pub day_change_pct: f64,
    /// Total paid.
    pub cost_basis: f64,
    /// Unrealised gain.
    pub unrealized: f64,
    /// Unrealised gain as a share of cost.
    pub unrealized_pct: f64,
}

/// Merge positions in the same instrument held on several platforms, largest first.
pub fn merge_holdings(holdings: &[&Holding]) -> Vec<MergedHolding> {
    let mut by_symbol: Vec<(String, Vec<&Holding>)> = Vec::new();
    for h in holdings {
        match by_symbol.iter_mut().find(|(s, _)| *s == h.symbol) {
            Some((_, group)) => group.push(h),
            None => by_symbol.push((h.symbol.clone(), vec![h])),
        }
    }
    let total: f64 = holdings.iter().map(|h| value_of(h)).sum();
    let mut merged: Vec<MergedHolding> = by_symbol
        .into_iter()
        .map(|(symbol, positions)| {
            let t = totals(&positions);
            let head = positions[0];
            let mut platform_ids: Vec<String> = Vec::new();
            for p in &positions {
                if !platform_ids.contains(&p.platform_id) {
                    platform_ids.push(p.platform_id.clone());
                }
            }
            MergedHolding {
                symbol,
                name: head.name.clone(),
                asset_class: head.asset_class.clone(),
                platform_ids,
                quantity: positions.iter().map(|p| p.quantity).sum(),
                price: head.price,
                value: t.value,
                weight: if total == 0.0 { 0.0 } else { t.value / total },
                day_change: t.day_change,
                day_change_pct: t.day_change_pct,
                cost_basis: t.cost,
                unrealized: t.unrealized,
                unrealized_pct: t.unrealized_pct,
            }
        })
        .collect();
    merged.sort_by(|a, b| b.value.total_cmp(&a.value));
    merged
}

/// One allocation slice.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Slice {
    /// Category label.
    pub label: String,
    /// Value in the category.
    pub value: f64,
    /// Share of the total.
    pub weight: f64,
}

/// Allocation by an attribute, largest first, small slices folded into "Other".
pub fn allocation(holdings: &[&Holding], key: impl Fn(&Holding) -> String) -> Vec<Slice> {
    let mut totals: BTreeMap<String, f64> = BTreeMap::new();
    for h in holdings {
        *totals.entry(key(h)).or_default() += value_of(h);
    }
    let total: f64 = totals.values().sum();
    let weight = |v: f64| if total == 0.0 { 0.0 } else { v / total };
    let mut sorted: Vec<Slice> = totals
        .into_iter()
        .map(|(label, value)| Slice {
            label,
            value,
            weight: weight(value),
        })
        .collect();
    sorted.sort_by(|a, b| b.value.total_cmp(&a.value));
    if sorted.len() <= MAX_SLICES {
        return sorted;
    }
    let rest: f64 = sorted[MAX_SLICES - 1..].iter().map(|s| s.value).sum();
    sorted.truncate(MAX_SLICES - 1);
    sorted.push(Slice {
        label: "Other".to_owned(),
        value: rest,
        weight: weight(rest),
    });
    sorted
}

/// Plain-language concentration warnings.
pub fn concentration_warnings(holdings: &[&Holding]) -> Vec<String> {
    let mut warnings = Vec::new();
    if let Some(top) = merge_holdings(holdings).first()
        && top.weight > POSITION_CONCENTRATION
    {
        warnings.push(format!(
            "{} is {}% of your portfolio.",
            top.symbol,
            (top.weight * 100.0).round()
        ));
    }
    if let Some(sector) = allocation(holdings, |h| h.sector.clone()).first()
        && sector.weight > SECTOR_CONCENTRATION
    {
        warnings.push(format!(
            "{} makes up {}% of your holdings.",
            sector.label,
            (sector.weight * 100.0).round()
        ));
    }
    warnings
}

/// Sum several platforms' day-end values and flows, date by date.
pub fn combine_history(series: &[&[ValuePoint]]) -> Vec<ValuePoint> {
    let Some(first) = series.first() else {
        return Vec::new();
    };
    first
        .iter()
        .enumerate()
        .map(|(i, p)| ValuePoint {
            date: p.date,
            value: series
                .iter()
                .map(|s| s.get(i).map_or(0.0, |x| x.value))
                .sum(),
            net_flow: series
                .iter()
                .map(|s| s.get(i).map_or(0.0, |x| x.net_flow))
                .sum(),
        })
        .collect()
}

/// Index of the first point inside `range`, counting back from the last point.
pub fn range_start(dates: impl Iterator<Item = NaiveDate> + Clone, range: Range) -> usize {
    let Some(end) = dates.clone().last() else {
        return 0;
    };
    let start = match range {
        Range::All => return 0,
        Range::YearToDate => NaiveDate::from_ymd_opt(end.year(), 1, 1).unwrap_or(end),
        Range::Week => end - Duration::days(7),
        Range::Month => end - Duration::days(30),
        Range::Quarter => end - Duration::days(91),
        Range::Year => end - Duration::days(365),
    };
    dates.clone().position(|d| d >= start).unwrap_or(0)
}

/// Daily returns with each day's flow removed, so deposits are not gains.
pub fn daily_returns(points: &[ValuePoint]) -> Vec<f64> {
    points
        .windows(2)
        .filter(|w| w[0].value != 0.0)
        .map(|w| (w[1].value - w[1].net_flow) / w[0].value - 1.0)
        .collect()
}

/// Time-weighted return: performance independent of when money moved.
pub fn time_weighted_return(points: &[ValuePoint]) -> f64 {
    daily_returns(points).iter().fold(1.0, |g, r| g * (1.0 + r)) - 1.0
}

/// Money-weighted return (Modified Dietz): the return the investor experienced.
pub fn money_weighted_return(points: &[ValuePoint]) -> f64 {
    let (Some(first), Some(last)) = (points.first(), points.last()) else {
        return 0.0;
    };
    if points.len() < 2 {
        return 0.0;
    }
    let span = (points.len() - 1) as f64;
    let mut flows = 0.0;
    let mut weighted = 0.0;
    for (i, p) in points.iter().enumerate().skip(1) {
        flows += p.net_flow;
        weighted += p.net_flow * ((span - i as f64) / span);
    }
    let invested = first.value + weighted;
    if invested == 0.0 {
        0.0
    } else {
        (last.value - first.value - flows) / invested
    }
}

/// Annualised standard deviation of daily returns.
pub fn annualised_volatility(returns: &[f64]) -> f64 {
    if returns.len() < 2 {
        return 0.0;
    }
    let n = returns.len() as f64;
    let mean = returns.iter().sum::<f64>() / n;
    let variance = returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / (n - 1.0);
    (variance * TRADING_DAYS).sqrt()
}

/// Largest peak-to-trough fall of the time-weighted index, as a negative share.
pub fn max_drawdown(points: &[ValuePoint]) -> f64 {
    let mut level = 1.0_f64;
    let mut peak = 1.0_f64;
    let mut worst = 0.0_f64;
    for r in daily_returns(points) {
        level *= 1.0 + r;
        peak = peak.max(level);
        worst = worst.min(level / peak - 1.0);
    }
    worst
}

/// Returns of a price series as flow-neutral value points.
pub fn price_points_as_values(points: &[PricePoint]) -> Vec<ValuePoint> {
    points
        .iter()
        .map(|p| ValuePoint {
            date: p.date,
            value: p.price,
            net_flow: 0.0,
        })
        .collect()
}

/// Dividend income received and expected, with the forward yield.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Income {
    /// Received over the last twelve months.
    pub trailing: f64,
    /// Expected over the next twelve months.
    pub forward: f64,
    /// Forward income over today's value.
    pub forward_yield: f64,
    /// Upcoming payments, soonest first.
    pub upcoming: Vec<UpcomingDividend>,
}

/// Income for a set of holdings and their upcoming dividends.
pub fn income(holdings: &[&Holding], upcoming: &[&UpcomingDividend]) -> Income {
    let value: f64 = holdings.iter().map(|h| value_of(h)).sum();
    let forward: f64 = holdings.iter().map(|h| h.dividends_next_12m).sum();
    let mut upcoming: Vec<UpcomingDividend> = upcoming.iter().map(|d| (*d).clone()).collect();
    upcoming.sort_by_key(|d| d.pay_date);
    Income {
        trailing: holdings.iter().map(|h| h.dividends_ttm).sum(),
        forward,
        forward_yield: if value == 0.0 { 0.0 } else { forward / value },
        upcoming,
    }
}

/// An instrument's change since the previous close: amount and share.
pub fn change(i: &Instrument) -> (f64, f64) {
    let amount = i.price - i.previous_close;
    let share = if i.previous_close == 0.0 {
        0.0
    } else {
        amount / i.previous_close
    };
    (amount, share)
}

/// Instruments matching a search, best first: exact symbol, symbol prefix,
/// a word in the name, then anywhere.
pub fn search<'a>(instruments: &'a [Instrument], query: &str) -> Vec<&'a Instrument> {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Vec::new();
    }
    let rank = |i: &Instrument| {
        let symbol = i.symbol.to_lowercase();
        let name = i.name.to_lowercase();
        if symbol == q {
            Some(0)
        } else if symbol.starts_with(&q) {
            Some(1)
        } else if name
            .split(|c: char| c.is_whitespace() || "/&.-".contains(c))
            .any(|w| w.starts_with(&q))
        {
            Some(2)
        } else if name.contains(&q) || symbol.contains(&q) {
            Some(3)
        } else {
            None
        }
    };
    let mut ranked: Vec<(u8, &Instrument)> = instruments
        .iter()
        .filter_map(|i| rank(i).map(|r| (r, i)))
        .collect();
    ranked.sort_by(|a, b| {
        a.0.cmp(&b.0).then(
            b.1.market_cap
                .unwrap_or(0.0)
                .total_cmp(&a.1.market_cap.unwrap_or(0.0)),
        )
    });
    ranked.into_iter().map(|(_, i)| i).collect()
}

/// Today's market-cap-weighted move per stock sector.
pub fn sector_moves(instruments: &[Instrument]) -> Vec<(String, f64)> {
    let mut sectors: BTreeMap<&str, (f64, f64)> = BTreeMap::new();
    for i in instruments.iter().filter(|i| i.asset_class == "Stocks") {
        let cap = i.market_cap.unwrap_or(0.0);
        let entry = sectors.entry(&i.group).or_default();
        entry.0 += cap;
        entry.1 += cap * change(i).1;
    }
    let mut moves: Vec<(String, f64)> = sectors
        .into_iter()
        .filter(|(_, (cap, _))| *cap > 0.0)
        .map(|(s, (cap, weighted))| (s.to_owned(), weighted / cap))
        .collect();
    moves.sort_by(|a, b| b.1.total_cmp(&a.1));
    moves
}
