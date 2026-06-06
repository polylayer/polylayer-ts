import type { HttpClient } from "../client.js";
import type { PmCtfParams, PmOrderParams, PmOrderResult } from "../types.js";

interface WriteOpts {
  idempotencyKey?: string;
}

export class PolymarketResource {
  constructor(private readonly http: HttpClient) {}

  /** Place a CLOB order. */
  placeOrder(
    params: PmOrderParams,
    opts: WriteOpts = {},
  ): Promise<PmOrderResult> {
    return this.http.request({
      method: "POST",
      path: "/polymarket/orders",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Cancel a single open order by its order id. */
  cancel(orderId: string, opts: WriteOpts = {}): Promise<PmOrderResult> {
    return this.http.request({
      method: "DELETE",
      path: `/polymarket/orders/${encodeURIComponent(orderId)}`,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Split USDC collateral into complete outcome-token sets. */
  split(params: PmCtfParams, opts: WriteOpts = {}): Promise<PmOrderResult> {
    return this.http.request({
      method: "POST",
      path: "/polymarket/split",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Merge complete outcome-token sets back into USDC. */
  merge(params: PmCtfParams, opts: WriteOpts = {}): Promise<PmOrderResult> {
    return this.http.request({
      method: "POST",
      path: "/polymarket/merge",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Redeem resolved positions for USDC. */
  redeem(params: PmCtfParams, opts: WriteOpts = {}): Promise<PmOrderResult> {
    return this.http.request({
      method: "POST",
      path: "/polymarket/redeem",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }
}
