// Market-buy then market-close on Hyperliquid.
// Run: POLYLAYER_API_KEY=plyr_... npx tsx examples/hyperliquid-order.ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

const open = await client.hyperliquid.placeOrder({
  coin: "BTC",
  is_buy: true,
  sz: "0.001",
  mode: "market_open",
  slippage: 0.03,
});
console.log("opened:", open);

await client.hyperliquid.placeOrder({
  coin: "BTC",
  is_buy: false,
  sz: "0.001",
  mode: "market_close",
  reduce_only: true,
});
console.log("closed");
