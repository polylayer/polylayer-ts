// USDC yield: read rates, deposit into the best Solana pool, then withdraw.
// Run: POLYLAYER_API_KEY=plyr_... npx tsx examples/earn.ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

// Per-chain APY (best of the chain's protocols) + your position + earned.
const summary = await client.earn.summary();
for (const c of summary.chains) {
  const apy = c.apy != null ? `${(c.apy * 100).toFixed(2)}%` : "n/a";
  console.log(`${c.label}: ${apy} APY (powered by ${c.poweredBy.join(", ")})`);
}

// Deposit $10 into Solana's best-APY pool.
const solana = summary.chains.find((c) => c.chain === "solana")!;
if (solana.bestProtocolId) {
  const dep = await client.earn.deposit({
    protocol: solana.bestProtocolId,
    amount: "10000000", // $10 in 6-decimal base units
  });
  console.log("deposited:", dep);

  // Later: withdraw everything back to your own address.
  const out = await client.earn.withdraw({
    protocol: solana.bestProtocolId,
    amount: "max",
  });
  console.log("withdrew:", out);
}
