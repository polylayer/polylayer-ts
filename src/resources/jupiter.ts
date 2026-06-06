import type { HttpClient } from "../client.js";
import type {
  JupCloseParams,
  JupModifyParams,
  JupOpenParams,
  JupTpslParams,
  JupTpslResult,
  JupTxResult,
  JupiterMarket,
} from "../types.js";

interface WriteOpts {
  idempotencyKey?: string;
}

export class JupiterResource {
  constructor(private readonly http: HttpClient) {}

  /** Open a perp position (SOL/BTC/ETH, long/short). */
  open(params: JupOpenParams, opts: WriteOpts = {}): Promise<JupTxResult> {
    return this.http.request({
      method: "POST",
      path: "/jupiter/positions/open",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Close a position by its base58 account pubkey. */
  close(params: JupCloseParams, opts: WriteOpts = {}): Promise<JupTxResult> {
    return this.http.request({
      method: "POST",
      path: "/jupiter/positions/close",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Add or remove collateral on a position. */
  modify(params: JupModifyParams, opts: WriteOpts = {}): Promise<JupTxResult> {
    return this.http.request({
      method: "POST",
      path: "/jupiter/positions/modify",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Attach take-profit and/or stop-loss to an open position. */
  tpsl(params: JupTpslParams, opts: WriteOpts = {}): Promise<JupTpslResult> {
    return this.http.request({
      method: "POST",
      path: "/jupiter/positions/tpsl",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Public market list (leverage caps, custodies). No write. */
  async markets(): Promise<JupiterMarket[]> {
    const res = await this.http.request<{ markets: JupiterMarket[] }>({
      method: "GET",
      path: "/jupiter/markets",
    });
    return res.markets;
  }
}
