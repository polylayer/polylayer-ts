/**
 * Polylayer — official TypeScript SDK.
 *
 * Bearer-keyed trading across Polymarket, Hyperliquid, and Jupiter
 * Perpetuals. Mint a `plyr_<key>` from the dashboard (Settings → API
 * Keys), then:
 *
 *   import { Polylayer } from "polylayer";
 *   const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });
 *
 *   await client.hyperliquid.placeOrder({
 *     coin: "BTC", is_buy: true, sz: "0.001", mode: "market_open",
 *   });
 *   const positions = await client.positions.list();
 */
import { HttpClient, type PolylayerOptions } from "./client.js";
import { HyperliquidResource } from "./resources/hyperliquid.js";
import { JupiterResource } from "./resources/jupiter.js";
import { PolymarketResource } from "./resources/polymarket.js";
import { ReadsResource } from "./resources/reads.js";

export class Polylayer {
  readonly hyperliquid: HyperliquidResource;
  readonly jupiter: JupiterResource;
  readonly polymarket: PolymarketResource;

  private readonly reads: ReadsResource;

  constructor(options: PolylayerOptions) {
    const http = new HttpClient(options);
    this.hyperliquid = new HyperliquidResource(http);
    this.jupiter = new JupiterResource(http);
    this.polymarket = new PolymarketResource(http);
    this.reads = new ReadsResource(http);
  }

  /** Unified positions across every venue the key covers. */
  get positions() {
    return { list: this.reads.positions.bind(this.reads) };
  }

  /** Unified open orders (Polymarket + Hyperliquid; Jupiter perps have none). */
  get orders() {
    return { open: this.reads.openOrders.bind(this.reads) };
  }

  /** Unified fills, paginated and newest-first. */
  get fills() {
    return { list: this.reads.fills.bind(this.reads) };
  }
}

export { PolylayerError } from "./errors.js";
export type { PolylayerErrorCode } from "./errors.js";
export type { PolylayerOptions } from "./client.js";
export * from "./types.js";
