//! A deterministic sample: the same portfolio, market and news the web app
//! shows, so the agent and the screens agree before real connectors exist.

mod data;
mod news;
#[cfg(test)]
mod test;

use chrono::{Datelike, Duration, NaiveDate, Weekday};

use crate::domain::models::{
    Holding, Instrument, MarketSnapshot, NewsItem, Platform, PlatformKind, PortfolioSnapshot,
    PricePoint, UpcomingDividend, ValuePoint,
};
use crate::domain::ports::{FintailDataError, FintailDataSource};

/// The trading day the sample is "as of".
pub const AS_OF: (i32, u32, u32) = (2026, 10, 16);
/// Daily points per series (matches the web app).
const DAILY_POINTS: usize = 400;
/// 52 weeks of trading days plus today.
const YEAR_POINTS: usize = 253;
/// Five-minute bars from 09:30 to 16:00.
const INTRADAY_POINTS: usize = 79;

/// Uniform numbers in [0, 1) from a 32-bit seed (mulberry32), bit-for-bit
/// the web app's `seededRandom`.
struct SeededRandom(u32);

impl SeededRandom {
    fn next(&mut self) -> f64 {
        self.0 = self.0.wrapping_add(0x6d2b_79f5);
        let mut t = self.0;
        t = (t ^ (t >> 15)).wrapping_mul(t | 1);
        t ^= t.wrapping_add((t ^ (t >> 7)).wrapping_mul(t | 61));
        f64::from(t ^ (t >> 14)) / 4_294_967_296.0
    }

    /// A standard normal draw (Box-Muller).
    fn normal(&mut self) -> f64 {
        let u = self.next();
        let v = self.next();
        (-2.0 * (1.0 - u).ln()).sqrt() * (2.0 * std::f64::consts::PI * v).cos()
    }
}

/// FNV-1a over a string, the web app's `seedFromString`.
fn seed_from_str(value: &str) -> u32 {
    value.encode_utf16().fold(2_166_136_261_u32, |hash, unit| {
        (hash ^ u32::from(unit)).wrapping_mul(16_777_619)
    })
}

fn as_of() -> NaiveDate {
    NaiveDate::from_ymd_opt(AS_OF.0, AS_OF.1, AS_OF.2).unwrap_or_default()
}

/// Weekday dates ending at the as-of day, oldest first.
fn trading_days(count: usize) -> Vec<NaiveDate> {
    let mut days = Vec::with_capacity(count);
    let mut day = as_of();
    while days.len() < count {
        if !matches!(day.weekday(), Weekday::Sat | Weekday::Sun) {
            days.push(day);
        }
        day -= Duration::days(1);
    }
    days.reverse();
    days
}

/// A random walk that lands on `end`, built backwards so the last close is
/// the quote and the one before it is the previous close.
fn walk_to(end: f64, previous: f64, vol: f64, days: &[NaiveDate], seed: u32) -> Vec<PricePoint> {
    let mut random = SeededRandom(seed);
    let mut prices = vec![0.0; days.len()];
    let last = days.len() - 1;
    prices[last] = end;
    if days.len() > 1 {
        prices[last - 1] = previous;
    }
    for i in (0..days.len().saturating_sub(2)).rev() {
        prices[i] = prices[i + 1] / (1.0 + 0.0004 + vol * random.normal());
    }
    days.iter()
        .zip(prices)
        .map(|(date, price)| PricePoint { date: *date, price })
        .collect()
}

/// Today's prices from the previous close to the quote, for the day's range.
fn intraday(row: &data::Row, seed: u32) -> Vec<f64> {
    let mut random = SeededRandom(seed);
    let mut drift = row.previous_close;
    (0..INTRADAY_POINTS)
        .map(|i| {
            let t = i as f64 / (INTRADAY_POINTS - 1) as f64;
            drift *= 1.0 + (row.vol / 9.0) * random.normal();
            if i == 0 {
                row.previous_close
            } else if i == INTRADAY_POINTS - 1 {
                row.price
            } else {
                drift * (1.0 - t) + row.price * t + (drift - row.previous_close) * t * (1.0 - t)
            }
        })
        .collect()
}

fn max(values: impl Iterator<Item = f64>) -> f64 {
    values.fold(f64::NEG_INFINITY, f64::max)
}

fn min(values: impl Iterator<Item = f64>) -> f64 {
    values.fold(f64::INFINITY, f64::min)
}

/// The sample market.
pub fn sample_market() -> MarketSnapshot {
    let days = trading_days(DAILY_POINTS);
    let mut instruments = Vec::new();
    let mut daily = Vec::new();
    for (asset_class, unit, rows) in data::UNIVERSE {
        for row in *rows {
            let seed = seed_from_str(row.symbol);
            let history = walk_to(row.price, row.previous_close, row.vol, &days, seed);
            let today = intraday(row, seed.wrapping_add(1));
            let year = &history[history.len().saturating_sub(YEAR_POINTS)..];
            instruments.push(Instrument {
                symbol: row.symbol.to_owned(),
                name: row.name.to_owned(),
                asset_class: (*asset_class).to_owned(),
                group: row.group.to_owned(),
                unit: *unit,
                currency: row.currency.unwrap_or("USD").to_owned(),
                exchange: row.exchange.map(str::to_owned),
                price: row.price,
                previous_close: row.previous_close,
                day_high: max(today.iter().copied()),
                day_low: min(today.iter().copied()),
                week52_high: max(year.iter().map(|p| p.price).chain(today.iter().copied())),
                week52_low: min(year.iter().map(|p| p.price).chain(today.iter().copied())),
                volume: row.volume_m.map(|m| m * 1e6),
                market_cap: row.market_cap_b.map(|b| b * 1e9),
                pe_ratio: row.pe,
                dividend_yield: row.dividend_yield,
            });
            daily.push((row.symbol.to_owned(), history));
        }
    }
    MarketSnapshot {
        as_of: as_of(),
        instruments,
        daily,
    }
}

/// The sample portfolio, priced from the sample market.
pub fn sample_portfolio(market: &MarketSnapshot) -> PortfolioSnapshot {
    let holdings: Vec<Holding> = data::SEEDS
        .iter()
        .map(|seed| {
            let quote = market.instruments.iter().find(|i| i.symbol == seed.symbol);
            Holding {
                platform_id: seed.platform_id.to_owned(),
                symbol: seed.symbol.to_owned(),
                name: seed.name.to_owned(),
                asset_class: seed.asset_class.to_owned(),
                sector: seed.sector.to_owned(),
                region: seed.region.to_owned(),
                quantity: seed.quantity,
                price: quote.map_or(seed.price, |q| q.price),
                previous_close: quote.map_or(seed.previous_close, |q| q.previous_close),
                cost_basis: seed.cost_basis,
                dividends_ttm: seed.dividends_ttm,
                dividends_next_12m: seed.dividends_next_12m,
            }
        })
        .collect();
    let days = trading_days(DAILY_POINTS);
    let history = data::PLATFORMS
        .iter()
        .enumerate()
        .map(|(index, (id, _, _))| {
            let seed = 101 + (index as u32) * 17;
            (id.to_string(), platform_history(&days, id, &holdings, seed))
        })
        .collect();
    PortfolioSnapshot {
        base_currency: "USD".to_owned(),
        platforms: data::PLATFORMS
            .iter()
            .map(|(id, name, crypto)| Platform {
                id: (*id).to_owned(),
                name: (*name).to_owned(),
                kind: if *crypto {
                    PlatformKind::Crypto
                } else {
                    PlatformKind::Brokerage
                },
            })
            .collect(),
        holdings,
        history,
        upcoming_dividends: data::UPCOMING_DIVIDENDS
            .iter()
            .filter_map(|(symbol, platform, date, amount)| {
                Some(UpcomingDividend {
                    symbol: (*symbol).to_owned(),
                    platform_id: (*platform).to_owned(),
                    pay_date: NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?,
                    amount: *amount,
                })
            })
            .collect(),
    }
}

/// A value history ending at the platform's current value, with today's move
/// equal to its holdings' day change and a deposit at each month start.
fn platform_history(
    days: &[NaiveDate],
    platform_id: &str,
    holdings: &[Holding],
    seed: u32,
) -> Vec<ValuePoint> {
    let (drift, vol, deposit) = data::PROFILE
        .iter()
        .find(|(id, ..)| *id == platform_id)
        .map_or((0.0, 0.0, 0.0), |(_, d, v, dep)| (*d, *v, *dep));
    let mine: Vec<&Holding> = holdings
        .iter()
        .filter(|h| h.platform_id == platform_id)
        .collect();
    let today = crate::domain::metrics::totals(&mine);
    let mut random = SeededRandom(seed);
    let last = days.len() - 1;
    let returns: Vec<f64> = (0..days.len())
        .map(|i| {
            if i == last {
                today.day_change_pct
            } else {
                drift + vol * random.normal()
            }
        })
        .collect();
    let flows: Vec<f64> = (0..days.len())
        .map(|i| {
            if i > 0 && days[i].month() != days[i - 1].month() {
                deposit
            } else {
                0.0
            }
        })
        .collect();
    let mut growth = 1.0;
    let mut flows_grown = 0.0;
    for i in 1..days.len() {
        growth *= 1.0 + returns[i];
        flows_grown = flows_grown * (1.0 + returns[i]) + flows[i];
    }
    let mut value = (today.value - flows_grown) / growth;
    let mut points = vec![ValuePoint {
        date: days[0],
        value,
        net_flow: 0.0,
    }];
    for i in 1..days.len() {
        value = value * (1.0 + returns[i]) + flows[i];
        points.push(ValuePoint {
            date: days[i],
            value,
            net_flow: flows[i],
        });
    }
    points
}

/// The sample data source.
#[derive(Debug, Clone, Default)]
pub struct SampleDataSource;

impl FintailDataSource for SampleDataSource {
    async fn portfolio(&self, _user_id: &str) -> Result<PortfolioSnapshot, FintailDataError> {
        Ok(sample_portfolio(&sample_market()))
    }

    async fn market(&self) -> Result<MarketSnapshot, FintailDataError> {
        Ok(sample_market())
    }

    async fn news(&self) -> Result<Vec<NewsItem>, FintailDataError> {
        Ok(news::sample_news())
    }
}
