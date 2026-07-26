import type { HttpClient } from "../client.js";
import type {
  PaperAccountCreateParams,
  PaperAccountPatchParams,
  PaperAccountResponse,
  PaperAccountsResponse,
  PaperFillsResponse,
  PaperOrderParams,
  PaperOrderResult,
  PaperOrdersResponse,
  PaperPortfolioResponse,
} from "../types.js";

interface WriteOpts {
  idempotencyKey?: string;
}

/** Paper trading accounts and execution groups. */
export class PaperResource {
  constructor(private readonly http: HttpClient) {}

  /** List your paper trading accounts. */
  accounts(): Promise<PaperAccountsResponse> {
    return this.http.request({ method: "GET", path: "/paper/accounts" });
  }

  /** Create a new paper account with simulated capital up to $100k. */
  createAccount(
    params: PaperAccountCreateParams,
    opts: WriteOpts = {},
  ): Promise<PaperAccountResponse> {
    return this.http.request({
      method: "POST",
      path: "/paper/accounts",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Fetch one paper account summary. */
  getAccount(paperAccountId: string): Promise<PaperAccountResponse> {
    return this.http.request({
      method: "GET",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}`,
    });
  }

  /** Update paper profile metadata/visibility. */
  updateAccount(
    paperAccountId: string,
    params: PaperAccountPatchParams,
    opts: WriteOpts = {},
  ): Promise<PaperAccountResponse> {
    return this.http.request({
      method: "PATCH",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}`,
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Full paper portfolio: account, positions, orders, fills. */
  portfolio(paperAccountId: string): Promise<PaperPortfolioResponse> {
    return this.http.request({
      method: "GET",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}/portfolio`,
    });
  }

  /** List paper orders, optionally by status. */
  orders(
    paperAccountId: string,
    params: { status?: string } = {},
  ): Promise<PaperOrdersResponse> {
    return this.http.request({
      method: "GET",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}/orders`,
      query: { status: params.status },
    });
  }

  /** Place a Polymarket/Hyperliquid/Jupiter paper order. */
  placeOrder(
    paperAccountId: string,
    params: PaperOrderParams,
    opts: WriteOpts = {},
  ): Promise<PaperOrderResult> {
    return this.http.request({
      method: "POST",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}/orders`,
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Cancel a resting paper order. */
  cancelOrder(
    paperAccountId: string,
    orderId: string,
    opts: WriteOpts = {},
  ): Promise<PaperOrderResult> {
    return this.http.request({
      method: "DELETE",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}/orders/${encodeURIComponent(orderId)}`,
      body: {},
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** List fills for one paper account. */
  fills(paperAccountId: string): Promise<PaperFillsResponse> {
    return this.http.request({
      method: "GET",
      path: `/paper/accounts/${encodeURIComponent(paperAccountId)}/fills`,
    });
  }
}
