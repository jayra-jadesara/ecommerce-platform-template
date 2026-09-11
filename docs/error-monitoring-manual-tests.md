# Phase 27 — Manual error monitoring test plan

For each **runtime** scenario verify:

1. Customer sees a friendly message (no stack / SQL / secrets)
2. Reference `ERR-XXXXXXXX` appears when applicable
3. Row appears in Admin → Error Logs
4. Correct tab (Page & Browser vs Database & Server)
5. User / page / store context present when known
6. Stack available to authorized Admin on detail
7. Sensitive values absent from message / metadata

| ID | Scenario | How to trigger | Expected tab | Notes |
|----|----------|----------------|--------------|-------|
| A | Browser JS error | Throw in console / temporary `throw new Error('test')` in a client button (dev only) | Page & Browser | GlobalErrorCapture |
| B | React component error | Render a component that throws | Page & Browser | AppErrorBoundary |
| C | Server route error | Force failure in a protected route (dev) | Database & Server | logError |
| D | Database failure | Invalid query / disconnect (staging) | Database & Server | database_code set |
| E | Checkout failure | Break order create | Database & Server + Payment filter | ORDER_CREATE_FAILED |
| F | Razorpay order failure | Invalid Razorpay keys | Database & Server + Payment | PROVIDER_ORDER_FAILED |
| G | Signature mismatch | Tamper checkout signature | Database & Server + Payment | CRITICAL |
| H | Webhook failure | Bad signature to `/api/webhooks/razorpay` | Database & Server + Payment | WEBHOOK_SIGNATURE_INVALID |
| I | Inventory finalization | Force inventory RPC failure after paid | Database & Server + Payment | INVENTORY_FINALIZATION_FAILED |
| J | Production build | `npm run build` / `npm run verify:production` | — (not Admin) | Must succeed; failures are CI/deploy only |
| K | Compile regression | Do **not** ship duplicate declarations; CI typecheck/build must fail if they return | — | See ThemeProvider reduced-motion regression test |

## Build / compile errors (not Admin Error Logs)

Duplicate `const`, syntax errors, TS failures, and module parse errors prevent the app from starting.

- They are **not** inserted into `error_logs`
- They must **fail** `npm run typecheck`, `npm run build`, CI, and `verify:production`
- Developers use the compiler / CI / hosting build log — not the Admin Error Logs UI

Full matrix: [error-monitoring-coverage.md](./error-monitoring-coverage.md)

Do **not** expose a public production `/api/errors/test` endpoint.
Do **not** create a production endpoint that intentionally causes compile errors.
