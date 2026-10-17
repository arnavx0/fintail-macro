//! Sample headlines, written to agree with the sample market's moves. Each is
//! a headline and a short summary, never a full article.

use crate::domain::models::{NewsCategory, NewsItem};

/// id, published at, source, headline, summary, symbols, category.
type NewsRow = (
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static [&'static str],
    NewsCategory,
);

const NEWS: &[NewsRow] = &[
    (
        "n-nvda-supply",
        "2026-10-16T19:42:00Z",
        "Reuters",
        "NVIDIA expands Blackwell supply deal with major cloud providers",
        "Three hyperscalers agreed multi-year allocations of NVIDIA's latest accelerators, easing concerns about data-centre demand into 2027.",
        &["NVDA"],
        NewsCategory::Company,
    ),
    (
        "n-tsla-deliveries",
        "2026-10-16T18:05:00Z",
        "Bloomberg",
        "Tesla's third-quarter deliveries beat estimates on China demand",
        "Deliveries rose year on year, ahead of analyst expectations, helped by a stronger quarter in China.",
        &["TSLA"],
        NewsCategory::Company,
    ),
    (
        "n-btc-etf",
        "2026-10-16T17:30:00Z",
        "CoinDesk",
        "Bitcoin ETFs record $1.2 billion of weekly inflows",
        "Spot bitcoin funds took in the most money in six weeks as volatility eased.",
        &["BTC"],
        NewsCategory::Crypto,
    ),
    (
        "n-sol-record",
        "2026-10-16T16:48:00Z",
        "The Block",
        "Solana network sets a daily transaction record",
        "On-chain activity hit an all-time high, led by payments and decentralised exchanges.",
        &["SOL"],
        NewsCategory::Crypto,
    ),
    (
        "n-eth-staking",
        "2026-10-16T16:10:00Z",
        "CoinDesk",
        "Ethereum slips as staking withdrawals climb",
        "The withdrawal queue lengthened for a third day, weighing on ether against bitcoin.",
        &["ETH"],
        NewsCategory::Crypto,
    ),
    (
        "n-bnb-review",
        "2026-10-16T15:22:00Z",
        "Financial Times",
        "Binance faces a fresh regulatory review in the EU",
        "Regulators opened a review of the exchange's European licensing; Binance said it is cooperating.",
        &["BNB"],
        NewsCategory::Crypto,
    ),
    (
        "n-aapl-iphone",
        "2026-10-16T14:55:00Z",
        "CNBC",
        "Apple unveils the iPhone 18 lineup with on-device AI features",
        "The new models ship next month; analysts are waiting for early demand data before changing estimates.",
        &["AAPL"],
        NewsCategory::Company,
    ),
    (
        "n-msft-azure",
        "2026-10-16T14:20:00Z",
        "The Information",
        "Microsoft's Azure growth reaccelerates, people familiar say",
        "Cloud revenue growth picked up in the quarter on AI workloads, ahead of Microsoft's results later this month.",
        &["MSFT"],
        NewsCategory::Company,
    ),
    (
        "n-jnj-dividend",
        "2026-10-16T13:40:00Z",
        "Dow Jones Newswires",
        "Johnson & Johnson raises its quarterly dividend",
        "The increase extends the company's run of annual dividend raises.",
        &["JNJ"],
        NewsCategory::Company,
    ),
    (
        "n-o-dividend",
        "2026-10-16T13:05:00Z",
        "Business Wire",
        "Realty Income declares its monthly dividend",
        "The REIT declared its regular monthly payout, payable at the end of the month.",
        &["O"],
        NewsCategory::Company,
    ),
    (
        "n-spx-tech",
        "2026-10-16T20:10:00Z",
        "Associated Press",
        "S&P 500 rises as technology shares lead",
        "The index gained about half a percent, with chipmakers and software among the biggest contributors.",
        &["SPX", "NDX"],
        NewsCategory::Markets,
    ),
    (
        "n-lly-trial",
        "2026-10-16T12:30:00Z",
        "STAT",
        "Eli Lilly gains after late-stage obesity trial results",
        "The company reported weight-loss results at the top of expectations for its next-generation drug.",
        &["LLY"],
        NewsCategory::Company,
    ),
    (
        "n-nflx-outlook",
        "2026-10-16T21:15:00Z",
        "Variety",
        "Netflix slips after a softer subscriber outlook",
        "Guidance for the holiday quarter came in below some estimates.",
        &["NFLX"],
        NewsCategory::Company,
    ),
    (
        "n-us10y-fed",
        "2026-10-16T11:45:00Z",
        "MarketWatch",
        "Treasury yields dip ahead of the Fed meeting",
        "The 10-year yield fell to about 4.02% as traders priced a slower pace of rate changes.",
        &["US10Y"],
        NewsCategory::Economy,
    ),
];

/// Recent sample news, newest first.
pub fn sample_news() -> Vec<NewsItem> {
    let mut items: Vec<NewsItem> = NEWS
        .iter()
        .map(
            |(id, at, source, headline, summary, symbols, category)| NewsItem {
                id: (*id).to_owned(),
                published_at: (*at).to_owned(),
                source: (*source).to_owned(),
                headline: (*headline).to_owned(),
                summary: (*summary).to_owned(),
                symbols: symbols.iter().map(|s| (*s).to_owned()).collect(),
                category: *category,
            },
        )
        .collect();
    items.sort_by(|a, b| b.published_at.cmp(&a.published_at));
    items
}
