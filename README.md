# polylayer

Official TypeScript SDK for the [Polylayer](https://polylayer.fyi) API — Bearer-keyed trading on **Polymarket**, **Hyperliquid**, and **Jupiter Perpetuals** from one key.

One API key trades your deposited funds on every venue. Polylayer resolves the key to your identity, signs inside a TEE with your deposit-wallet authority, and submits to the underlying venue (Polymarket V2 CLOB, Hyperliquid Exchange, on-chain Jupiter Perpetuals).

## Install

```bash
npm install polylayer
```

Node 18+ (uses the global `fetch`) or any modern browser/runtime.

## Quick start

Mint a key from the dashboard: **Settings → API Keys → Unified**. The plaintext (`plyr_…`) is shown once.

```ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

// Market-buy 0.001 BTC on Hyperliquid
await client.hyperliquid.placeOrder({
  coin: "BTC",
  is_buy: true,
  sz: "0.001",
  mode: "market_open",
});

// Open a 5x SOL long on Jupiter ($25 notional)
const { tx_signature } = await client.jupiter.open({
  asset: "SOL",
  side: "long",
  size_usd: 25,
  leverage: 5,
});

// Limit-buy YES at $0.62 on a Polymarket market ($10)
await client.polymarket.placeOrder({
  market_id: "0x1234…",        // CLOB token id (bytes32)
  side: "BUY",
  price: 0.62,
  size_usdc: "10000000",        // 6-decimal base units
});

// Read positions across all three venues
for (const p of await client.positions.list()) {
  if (p.platform === "hyperliquid") console.log(p.coin, p.sz, p.unrealized_pnl_usd);
  if (p.platform === "jupiter") console.log(p.asset, p.size_usd);
  if (p.platform === "polymarket") console.log(p.market_id, p.size_usdc);
}
```

## Conventions

- **Money is strings in base units.** USDC sizes (`size_usdc`, `amount_usdc`) are 6-decimal integer strings — `"10000000"` is $10. Hyperliquid sizes/prices are decimal strings (`"0.001"`, `"65000"`). This avoids float precision loss on large balances.
- **Idempotency is automatic.** Every write sends an `Idempotency-Key`; the SDK generates a UUID if you do not pass one. To make a specific call safe to retry yourself, pass `{ idempotencyKey }` as the second argument — replays return the original result, conflicts throw `idempotency_conflict`.
- **Errors are typed.** Non-2xx responses throw `PolylayerError` with `.code`, `.status`, `.retryAfter`, and `.body`. 429s and 5xx are retried automatically (`maxRetries`, default 2).

```ts
import { PolylayerError } from "polylayer";

try {
  await client.hyperliquid.placeOrder({ coin: "BTC", is_buy: true, sz: "0.001", mode: "market_open" });
} catch (err) {
  if (err instanceof PolylayerError && err.code === "bounds_exceeded") {
    // per-platform key hit its size/total cap
  }
}
```

## Configuration

```ts
new Polylayer({
  apiKey: "plyr_…",                  // required
  baseUrl: "https://api.polylayer.fyi", // default
  timeoutMs: 30_000,                 // per-request
  maxRetries: 2,                     // on 429 / 5xx
  fetch: customFetch,                // optional (Node <18, proxies, tests)
});
```

## API

### Reads (unified across venues)

| Method | Returns |
| --- | --- |
| `client.positions.list({ platform? })` | `Position[]` (discriminated by `platform`) |
| `client.orders.open({ platform? })` | `OpenOrder[]` |
| `client.fills.list({ since?, cursor?, platform? })` | `{ fills, next_cursor }` |

### Hyperliquid — `client.hyperliquid`

`placeOrder`, `cancel({ coin, oid | cloid })`, `bulkOrders`, `placeTpsl`, `modifyOrder`, `setLeverage`, `setIsolatedMargin`, `transfer`, `withdraw`. Markets are auto-routed (vanilla and HIP-3); you never pass a `dex`.

```ts
// Market open, then market close
await client.hyperliquid.placeOrder({ coin: "ETH", is_buy: true, sz: "0.05", mode: "market_open", slippage: 0.03 });
await client.hyperliquid.placeOrder({ coin: "ETH", is_buy: false, sz: "0.05", mode: "market_close", reduce_only: true });

// Open a long with a linked take-profit + stop-loss in one call (normalTpsl)
await client.hyperliquid.placeTpsl({
  coin: "SOL", is_buy: true, sz: "0.5",
  entry_px: "150",   // marketable limit entry
  tp_px: "180",      // take-profit trigger
  sl_px: "130",      // stop-loss trigger
});

// Cancel resting orders (asset-scoped) — by oid or cloid, from orders.open()
for (const o of await client.orders.open({ platform: "hyperliquid" })) {
  if (o.platform === "hyperliquid") await client.hyperliquid.cancel({ coin: o.coin, oid: o.oid });
}
```

### Jupiter Perpetuals — `client.jupiter`

`open`, `close`, `modify`, `tpsl`, `markets()`. Backed by the JLP pool (SOL/BTC/ETH).

### Polymarket — `client.polymarket`

`placeOrder`, `cancel(orderId)`, `split`, `merge`, `redeem`.

## Key types

- **Unified key (recommended)** — one key, every venue, no caps. You hold it; anyone with it can trade your funds until you revoke it.
- **Per-platform key** — bound to one venue with TEE-enforced bounds (`max_total`, per-order size, allow-list, price band, expiry). Calls to the wrong venue return `wrong_platform`.

Keys are minted and revoked from the dashboard (SIWS-authenticated). The SDK consumes an existing key.

## License

MIT
