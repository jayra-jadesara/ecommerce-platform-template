# Error monitoring — coverage matrix (Phase 27 / 27.2)

## Correct claim

**All runtime application errors are centrally monitored.**  
**Build/deployment failures are blocked by CI / `verify:production`.**

Do **not** claim: “All errors are stored in `error_logs`.”  
True compile/build failures never start the app, so they cannot insert into `error_logs`.

---

## Runtime → Admin Error Logs (`error_logs` + `ERR-XXXXXXXX`)

| Area | Captured? | Mechanism |
|------|-----------|-----------|
| Browser runtime | Yes | `GlobalErrorCapture` → `BROWSER` |
| React render runtime | Yes | `AppErrorBoundary` → `REACT` |
| Page rendering (`error.tsx`) | Yes | Segment / root / global error UI → `PAGE` |
| Server runtime | Yes | `logError` / `unexpectedFailure` → `SERVER` |
| Database runtime | Yes | `DATABASE` source/type |
| API routes | Yes | Server logger |
| Payment / Razorpay | Yes | `logPaymentError` / payment ops |
| Webhook | Yes | Webhook handlers |
| Order / inventory / cart / checkout | Yes | Domain services |
| Storage / media | Yes | Media services |
| CMS / blog | Yes | CMS / blog services |

Admin UI tabs:

- **Page & Browser Errors** — client / PAGE / BROWSER / REACT
- **Database & Server Errors** — server / DB / webhook / provider / payment

There is **no** “Build Errors” tab in Admin. Build failures are not runtime rows.

Customer-facing runtime UI: friendly title + message, optional `Reference: ERR-…`, Try Again / Back to Store. No stacks, SQL, or secrets.

---

## Build / compile → CI & deployment logs only

| Failure | Captured in `error_logs`? | Where it is caught |
|---------|---------------------------|--------------------|
| Duplicate declaration / syntax | No | `npm run typecheck` / `npm run build` / CI |
| TypeScript compile failure | No | `npm run typecheck` / CI |
| Module resolution / parse failure | No | `npm run build` / CI |
| Next.js build compilation | No | `npm run build`, Vercel/hosting build logs |
| Env / secret scan gate | No | `npm run verify:production` |

### Verification pipeline

```bash
npm run verify:production
```

Runs (fail-fast):

1. Env / secret checks  
2. `typecheck`  
3. `lint`  
4. `test`  
5. `build`

GitHub Actions (`.github/workflows/ci.yml`) runs the same quality gates on PR/push. A failed job **blocks** treating the revision as deployable.

Hosting (e.g. Vercel): platform build logs are the source of truth for deploy-time compile failures. Do not pipe those into Supabase `error_logs` from the app.

---

## Why React / `error.tsx` cannot catch compile errors

Example: `const reducedMotion` declared twice in a module.

- Next.js shows a **Build Error** overlay / fails `next build`
- React never mounts → ErrorBoundary / browser capture / page `error.tsx` never run
- No `error_logs` row is expected or fabricated

Fix the source, then rely on CI so a broken build never goes live.

---

## Manual runtime tests

See [error-monitoring-manual-tests.md](./error-monitoring-manual-tests.md).
