import type { HttpClient } from "../client.js";
import type {
  Fill,
  FillsParams,
  OpenOrder,
  OpenOrdersParams,
  Position,
  PositionsParams,
} from "../types.js";

/**
 * Unified read surface across all venues the key covers. Each row
 * carries a `platform` discriminator so you can narrow the union:
 *
 *   for (const p of await client.positions.list())
 *     if (p.platform === "hyperliquid") console.log(p.coin, p.sz);
 */
export class ReadsResource {
  constructor(private readonly http: HttpClient) {}

  async positions(params: PositionsParams = {}): Promise<Position[]> {
    const res = await this.http.request<{ positions: Position[] }>({
      method: "GET",
      path: "/positions",
      query: { platform: params.platform },
    });
    return res.positions;
  }

  async openOrders(params: OpenOrdersParams = {}): Promise<OpenOrder[]> {
    const res = await this.http.request<{ orders: OpenOrder[] }>({
      method: "GET",
      path: "/orders/open",
      query: { platform: params.platform },
    });
    return res.orders;
  }

  /** Fills are paginated; `next_cursor` is null when exhausted. */
  fills(
    params: FillsParams = {},
  ): Promise<{ fills: Fill[]; next_cursor: string | null }> {
    return this.http.request({
      method: "GET",
      path: "/fills",
      query: {
        since: params.since,
        cursor: params.cursor,
        platform: params.platform,
      },
    });
  }
}
