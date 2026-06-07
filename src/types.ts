/**
 * Wire types for the Polylayer v1 API.
 *
 * Request types mirror the server's zod schemas (lib/v1/schemas.ts);
 * response types mirror the documented row shapes (read-endpoints) and
 * the per-venue trade results. Numeric quantities are strings in base
 * units ("atoms") where the server uses them, so large balances never
 * lose precision in JS.
 */

export type Platform = "polymarket" | "hyperliquid" | "jupiter";

// ─── Polymarket requests ─────────────────────────────────────────────

export interface PmOrderParams {
  /** 0x bytes32 CLOB token id. */
  market_id: string;
  side: "BUY" | "SELL";
  /** Limit price in [0, 1]. */
  price: number;
  /** USDC, 6-decimal base units, as a string (e.g. "10000000" = $10). */
  size_usdc: string;
  post_only?: boolean;
  /** Defaults GTC server-side. */
  order_type?: "GTC" | "FOK" | "GTD";
  /** Required when order_type === "GTD". */
  expiration_unix_seconds?: number;
  /** Negative-risk market flag (defaults false). */
  neg_risk?: boolean;
  /** Market tick size (0.1 | 0.01 | 0.001 | 0.0001); defaults 0.01.
   *  Drives the CLOB-required price/amount rounding. */
  tick_size?: number;
}

export interface PmCtfParams {
  /** 0x bytes32 condition id. */
  condition_id: string;
  /** USDC, 6-decimal base units, as a string. */
  amount_usdc: string;
}

// ─── Hyperliquid requests ────────────────────────────────────────────

export interface HlOrderParams {
  coin: string;
  is_buy: boolean;
  /** Size in coin units, decimal string (e.g. "0.01"). */
  sz: string;
  /** Limit price, decimal string. Required for mode "limit". */
  limit_px?: string;
  /** Defaults "limit". */
  mode?: "limit" | "market_open" | "market_close";
  reduce_only?: boolean;
  tif?: "Gtc" | "Ioc" | "Alo";
  /** Market modes only; default 5% (0.05). Range [0, 0.5]. */
  slippage?: number;
  /** Optional client order id, 0x + 32 hex chars. */
  cloid?: string;
}

export interface HlCancelParams {
  /** Asset symbol — HL cancels are asset-scoped (required). */
  coin: string;
  /** Cancel by client order id (0x + 32 hex). */
  cloid?: string;
  /** Or cancel by numeric order id. Provide cloid OR oid. */
  oid?: number;
}

/** Native HL order_type — a plain limit or a trigger leg (TP/SL). */
export type HlOrderType =
  | { limit: { tif: "Gtc" | "Ioc" | "Alo" } }
  // triggerPx is numeric — the venue formats it as a float.
  | { trigger: { isMarket: boolean; triggerPx: number; tpsl: "tp" | "sl" } };

/** One leg of a bulk order (HL-native shape). order_type carries trigger
 *  legs so take-profit / stop-loss work; omit it for a plain Gtc limit. */
export interface HlBulkOrderItem {
  coin: string;
  is_buy: boolean;
  sz: string;
  limit_px: string;
  reduce_only?: boolean;
  order_type?: HlOrderType;
  cloid?: string;
}

export interface HlBulkOrdersParams {
  /** 1–20 legs. */
  orders: HlBulkOrderItem[];
  /** Link an entry with its TP/SL legs. Defaults "na". */
  grouping?: "na" | "normalTpsl" | "positionTpsl";
}

/** Convenience: open a position with a take-profit and/or stop-loss in
 *  one linked (normalTpsl) bulk order. */
export interface HlTpslParams {
  coin: string;
  /** Entry direction — true = long/buy. */
  is_buy: boolean;
  /** Size in coin units (decimal string). */
  sz: string;
  /** Entry limit price (marketable for an immediate fill). */
  entry_px: string;
  /** Take-profit trigger price (provide tp_px and/or sl_px). */
  tp_px?: string;
  /** Stop-loss trigger price. */
  sl_px?: string;
  /** Reduce-only entry (rare). Default false. */
  entry_reduce_only?: boolean;
}

export interface HlModifyOrderParams {
  oid: number;
  new_limit_px?: string;
  new_sz?: string;
}

export interface HlLeverageParams {
  coin: string;
  /** 1–100. */
  leverage: number;
  is_cross: boolean;
}

export interface HlIsolatedMarginParams {
  coin: string;
  /** Signed USDC base units; "+" adds, "-" removes. */
  delta_usdc: string;
}

export interface HlTransferParams {
  direction: "to_perp" | "to_spot";
  /** USDC, decimal string. */
  amount: string;
}

export interface HlWithdrawParams {
  /** Arbitrum destination; defaults to the user's TEE EVM address. */
  destination?: string;
  /** USDC, decimal string. */
  amount: string;
}

// ─── Jupiter requests ────────────────────────────────────────────────

export interface JupOpenParams {
  asset: "SOL" | "BTC" | "ETH";
  side: "long" | "short";
  /** Position size in USD (float). */
  size_usd: number;
  /** 1–100. */
  leverage: number;
  /** Defaults 50. Range 1–1000. */
  slippage_bps?: number;
}

export interface JupCloseParams {
  /** Base58 position account pubkey. */
  position_id: string;
  slippage_bps?: number;
}

export interface JupTpslParams {
  position_id: string;
  asset: "SOL" | "BTC" | "ETH";
  /** Full position size in USD (entire-position TP/SL). */
  size_usd: number;
  tp_price_usd?: number;
  sl_price_usd?: number;
}

export interface JupModifyParams {
  position_id: string;
  /** Signed USDC base units; "+" adds collateral, "-" removes. */
  delta_collateral_usdc: string;
}

// ─── Read params ─────────────────────────────────────────────────────

export interface PositionsParams {
  platform?: Platform;
}

export interface OpenOrdersParams {
  platform?: Platform;
}

export interface FillsParams {
  /** Unix-seconds floor; defaults to 24h ago server-side. */
  since?: number;
  cursor?: string;
  platform?: Platform;
}

// ─── Read responses (rows carry a `platform` discriminator) ──────────

export interface PolymarketPosition {
  platform: "polymarket";
  market_id: string;
  outcome: string;
  size_usdc: string;
  avg_price: number;
  unrealized_pnl_usdc: string;
}
export interface HyperliquidPosition {
  platform: "hyperliquid";
  coin: string;
  side: "long" | "short";
  sz: string;
  entry_px: string;
  leverage: number;
  is_cross: boolean;
  unrealized_pnl_usd: string;
}
export interface JupiterPosition {
  platform: "jupiter";
  /** On-chain position account pubkey — pass to jupiter.close/modify/tpsl. */
  position_id: string;
  asset: string;
  side: "long" | "short";
  size_usd: string;
  entry_price: number;
  leverage: number;
  unrealized_pnl_usd: string | null;
}
export type Position =
  | PolymarketPosition
  | HyperliquidPosition
  | JupiterPosition;

export interface PolymarketOpenOrder {
  platform: "polymarket";
  order_id: string;
  market_id: string;
  side: string;
  price: string;
  size_usdc: string;
  remaining: string;
  created_at: number;
}
export interface HyperliquidOpenOrder {
  platform: "hyperliquid";
  oid: number;
  cloid: string | null;
  coin: string;
  is_buy: boolean;
  sz: string;
  limit_px: string;
  tif: string;
  timestamp: number;
}
export type OpenOrder = PolymarketOpenOrder | HyperliquidOpenOrder;

export interface PolymarketFill {
  platform: "polymarket";
  order_id: string;
  market_id: string;
  side: string;
  price: string;
  size_usdc: string;
  fee_usdc: string;
  tx_hash: string;
  ts_unix: number;
}
export interface HyperliquidFill {
  platform: "hyperliquid";
  coin: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  fee_usd: string;
  oid: number;
  tx_hash: string | null;
  ts_unix: number;
}
export type Fill = PolymarketFill | HyperliquidFill;

export interface JupiterMarket {
  [key: string]: unknown;
}

// ─── Write responses ─────────────────────────────────────────────────

/** Jupiter open/close/modify all return a tx signature. */
export interface JupTxResult {
  tx_signature: string;
  cumulative_size_usdc_used?: string;
}

/** Jupiter TP/SL may submit multiple txs (one per leg). */
export interface JupTpslResult {
  tx_signature: string;
  tx_signatures: string[];
  tpsl_pubkeys: string[];
}

/**
 * Hyperliquid writes pass the raw exchange response through. Shape
 * follows the HL Exchange API: { status: "ok", response: {...} }.
 */
export interface HlExchangeResult {
  status?: string;
  response?: { type?: string; data?: unknown } & Record<string, unknown>;
  [key: string]: unknown;
}

/** Polymarket writes pass the CLOB lambda response through. */
export interface PmOrderResult {
  success?: boolean;
  orderID?: string;
  order_id?: string;
  status?: string;
  [key: string]: unknown;
}
