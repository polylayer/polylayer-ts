# polylayer examples

Set `POLYLAYER_API_KEY` (mint one in the dashboard → Settings → API Keys), then:

```bash
POLYLAYER_API_KEY=plyr_... npx tsx examples/<file>.ts
```

| File | What |
| --- | --- |
| `hyperliquid-order.ts` | market open + close |
| `hyperliquid-tpsl.ts` | open with linked take-profit + stop-loss |
| `jupiter-open-close.ts` | open a perp long, then close it |
| `polymarket-order.ts` | place + cancel a CLOB order (`TOKEN_ID` env) |
| `read-portfolio.ts` | unified positions / orders / fills |
