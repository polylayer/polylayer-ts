import type { HttpClient } from "../client.js";
import type {
  HlBulkOrdersParams,
  HlCancelParams,
  HlExchangeResult,
  HlIsolatedMarginParams,
  HlLeverageParams,
  HlModifyOrderParams,
  HlOrderParams,
  HlTransferParams,
  HlWithdrawParams,
} from "../types.js";

/** Writes accept an optional `idempotencyKey` to make retries safe. */
interface WriteOpts {
  idempotencyKey?: string;
}

export class HyperliquidResource {
  constructor(private readonly http: HttpClient) {}

  /** Place a single order (limit / market_open / market_close). */
  placeOrder(
    params: HlOrderParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/orders",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /**
   * Cancel one resting order. HL cancels are asset-scoped, so `coin` is
   * required; identify the order by `cloid` or `oid` (from orders.open()).
   */
  cancel(
    params: HlCancelParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    const id = params.cloid ?? params.oid;
    if (id === undefined) {
      throw new Error("hyperliquid.cancel: provide cloid or oid");
    }
    return this.http.request({
      method: "DELETE",
      path: `/hyperliquid/orders/${encodeURIComponent(String(id))}`,
      query: { coin: params.coin },
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Place up to 20 orders atomically (e.g. TP/SL groups). */
  bulkOrders(
    params: HlBulkOrdersParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/bulk-orders",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  modifyOrder(
    params: HlModifyOrderParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/modify-order",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  setLeverage(
    params: HlLeverageParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/leverage",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  setIsolatedMargin(
    params: HlIsolatedMarginParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/isolated-margin",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Move USDC between perp and spot accounts. */
  transfer(
    params: HlTransferParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/transfer",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Withdraw USDC to Arbitrum (withdraw3). */
  withdraw(
    params: HlWithdrawParams,
    opts: WriteOpts = {},
  ): Promise<HlExchangeResult> {
    return this.http.request({
      method: "POST",
      path: "/hyperliquid/withdraw",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }
}
