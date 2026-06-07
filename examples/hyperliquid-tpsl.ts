// Open a long with a linked take-profit + stop-loss in one call.
// Run: POLYLAYER_API_KEY=plyr_... npx tsx examples/hyperliquid-tpsl.ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

const res = await client.hyperliquid.placeTpsl({
  coin: "SOL",
  is_buy: true,
  sz: "0.5",
  entry_px: "150", // marketable limit entry
  tp_px: "180",
  sl_px: "130",
});
console.log("tp/sl placed:", res);
