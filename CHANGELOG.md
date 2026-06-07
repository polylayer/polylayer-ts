# Changelog

## 0.1.0

Initial release. Bearer-keyed (`plyr_*`) client for the Polylayer v1 API.

- **Hyperliquid**: place/cancel (by oid or cloid), bulk orders, `placeTpsl`
  (linked take-profit/stop-loss), modify, leverage, isolated margin,
  transfer, withdraw. Market + limit + trigger order types.
- **Jupiter Perpetuals**: open, close, modify, tpsl, markets.
- **Polymarket**: place/cancel orders (tick-aware amounts), split, merge, redeem.
- **Reads**: unified positions, open orders, fills across all venues.
- Transport: automatic idempotency keys, retry on 429/5xx (same key reused),
  typed errors (`PolylayerError` with `code`/`status`/`retryAfter`).
