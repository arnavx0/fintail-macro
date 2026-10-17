//! Domain layer for Fintail's investor data.

pub mod metrics;
pub mod models;
#[cfg(feature = "ports")]
pub mod ports;
#[cfg(feature = "ports")]
pub mod service;
