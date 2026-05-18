## Context

This is greenfield work for a Synacy hackathon project. The Angular shell is scaffolded (CLI 21.1.4, SCSS, zoneless, routing) and a Spring Boot service is to be created. The product target — see `proposal.md` — is a Bonusly-style peer recognition app: give monthly-refreshing points to teammates, view a public feed, redeem accumulated earned points for rewards.

The defining constraint, set by the user up front, is that **Google Sheets is the data store**. There is no Postgres / relational DB. This is a deliberate hackathon trade-off: no DB infra to provision, the data is human-readable, and non-technical stakeholders can inspect the spreadsheet directly. Expected load is small (one company, dozens of employees, low concurrency).

## Goals / Non-Goals

**Goals:**

- Demonstrable end-to-end loop: log in → give recognition → see it on the feed → earned balance increases → redeem a reward.
- Backend cleanly decouples domain logic from the Sheets data layer so a relational store can replace Sheets later without rewriting the API surface.
- Frontend uses modern Angular (signals, zoneless, standalone components) so the resulting code base is a reasonable starting point if the prototype is greenlit.

**Non-Goals:**

- Production scale, multi-tenancy, or high concurrency.
- Synacy SSO / Google OAuth login (deferred to a follow-up proposal).
- Slack, Microsoft Teams, or any other integration.
- Admin analytics, exports, audit logs, password reset, email notifications.
- Comments, reactions, or add-on/pile-on points on recognitions.
- Mobile-first / responsive polish — desktop layout only.

## Decisions

### 1. Stack split: Angular dev server + Spring Boot API

The Angular app runs under `ng serve` during development and is built as a static bundle for the demo. The Spring Boot service exposes a JSON REST API under `/api/v1/...`. CORS is allowed from the Angular dev origin.

- **Alternative considered**: serve the Angular bundle directly from Spring Boot. Rejected for the hackathon because losing Angular's hot reload slows iteration far more than it gains in deployment simplicity.

### 2. Google Sheets via service account

A single Google Spreadsheet is the source of truth. The Spring Boot service authenticates to the Sheets v4 API using a **service-account JSON credential** loaded from an env var. Users do **not** authenticate to Google themselves; the service writes on everyone's behalf.

- **Alternative considered**: each user OAuths to Google so the app writes as them. Rejected because consistent service identity simplifies cross-user reads/writes (e.g., the feed reads everyone's recognitions) and avoids a per-user OAuth dance.
- **Trade-off**: the service account is a single privileged actor; if its credential leaks, the whole spreadsheet is exposed. Mitigation: rotate the service account periodically; keep the credential out of the repo.

### 3. Sheet layout

One spreadsheet, four tabs:

| Tab            | Columns                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`        | `id` (UUID), `email`, `name`, `passwordHash` (BCrypt), `givingBalance` (int), `givingMonth` (YYYY-MM), `earnedBalance` (int), `createdAt` (ISO-8601 UTC) |
| `recognitions` | `id` (UUID), `giverId`, `recipientId`, `amount` (int), `message`, `hashtags` (comma-sep), `createdAt`                                            |
| `rewards`      | `id` (UUID), `name`, `description`, `costPoints` (int), `imageUrl`, `active` (bool)                                                              |
| `redemptions`  | `id` (UUID), `userId`, `rewardId`, `costPoints` (int snapshot), `createdAt`, `status` (`pending`/`fulfilled`/`cancelled`)                        |

Row 1 is the header. All IDs are UUIDs (server-generated) so we never rely on Sheets row numbers as identifiers. Rows are **never deleted** — soft-cancel or status flags only — because deletion shifts subsequent row numbers and breaks any cached indices.

- **Alternative considered**: a single `events` tab with an event-sourced log. Rejected as too clever for a hackathon and harder for non-technical stakeholders to read.

### 4. Authentication: email/password + JWT

Users are pre-seeded into the `users` tab (no self-signup in MVP). Login takes `{email, password}`, validates the BCrypt hash, and returns a signed JWT (HS256, server secret in env var). The Angular app stores the JWT in `localStorage` and attaches it via an `Authorization: Bearer …` header through an HTTP interceptor. An `AuthGuard` protects all routes except `/login`.

- **Alternative considered**: defer auth entirely (anyone can act as anyone via a dropdown) for the demo. Rejected because the recognition feed loses meaning if it isn't tied to real identity, and adding auth later means re-doing every endpoint.
- **Alternative considered**: Google OAuth / Synacy SSO. Deferred — captured as future work, not MVP.

### 5. Monthly allowance refresh: lazy

Each user row carries `givingBalance` and `givingMonth` (YYYY-MM). Every time a user attempts to give recognition (or fetches their profile), the service checks: if `givingMonth != currentMonth(UTC)`, set `givingBalance := DEFAULT_ALLOWANCE` and `givingMonth := currentMonth`, then proceed. No scheduler, no nightly job.

- **Alternative considered**: a scheduled Spring `@Scheduled` task on the 1st of each month that rewrites every user row. Rejected because lazy refresh has equivalent behaviour, naturally handles users who don't log in for a month, and avoids a write storm at midnight on the 1st (which would risk hitting Sheets quotas).

### 6. Concurrency: serialize writes

Google Sheets has no transactions. To prevent races (two simultaneous "give" actions mis-incrementing a balance), all writes go through a single-threaded `ExecutorService` in the Spring Boot service. Reads can run concurrently. Each write task is small (read affected rows → mutate → write back) and serialized.

- **Alternative considered**: optimistic concurrency via a `rowVersion` column. Rejected — overkill for <100 users with low concurrency, and would require retry logic on every write.
- **Trade-off**: the API becomes single-instance. We cannot horizontally scale the Spring Boot service. That is acceptable for a hackathon demo.

### 7. Frontend state: signals + per-domain services

Angular is zoneless, so we use signals for component state. Each domain has a service (`AuthService`, `RecognitionService`, `RewardsService`) that owns its signals and HTTP calls. No NgRx, no Akita — overkill for the scope.

### 8. Caching

Spring Boot keeps in-memory caches with a ~60s TTL for `users` (excluding `passwordHash`) and `rewards`, both of which churn slowly. Recognitions and redemptions are not cached (they grow append-only and the feed always wants fresh data; we will paginate at the API instead).

### 9. Hashtags / company values

For MVP, the list of allowed hashtags is a configuration property in `application.yml` (e.g., `app.hashtags: [teamwork, ownership, impact, kindness]`). The give-recognition endpoint validates that submitted hashtags are in this list. A future iteration can move this to a `values` tab if admins need to edit it without redeploying.

### 10. Multi-recipient recognitions = N rows

A recognition addressed to N recipients is stored as N separate rows in the `recognitions` sheet — one per `(giver, recipient)` pair — each with its own UUID. All rows share the same `message`, `hashtags`, and `createdAt`. The per-recipient `amount` is the same on every row. The giver's allowance is debited by `amount × N` in a single update.

- **Alternative considered**: a single row with a comma-separated recipient list. Rejected because the feed would then need post-processing on every read, balance accounting would parse strings on the hot path, and rows would not be self-contained.
- **Trade-off**: the feed shows N items for one logical "give" action. That mirrors Bonusly's behaviour and avoids special-casing in the feed renderer. If grouping is desired later, the shared `createdAt` + identical `message` are enough of a key to fold them client-side.
- **Atomicity**: the entire multi-recipient give is processed in one task on the write executor (decision 6) — validate everything first, then append all N rows and credit all N recipients, then debit the giver once. A partial-write failure is logged with all affected ids for manual reconciliation.

## Risks / Trade-offs

- **Sheets API quotas (60 reads/min and 60 writes/min per project per user)** → cache reads aggressively (decision 8), serialize writes (decision 6), and surface a clear "please retry" error to the client on rate-limit. Worst case: instruct the demo audience to slow down.
- **No transactions on Sheets** → write serialization mitigates intra-process races; cross-process is not a concern because we run a single instance (decision 6).
- **Service-account credential leakage** → keep credential in env var, never commit it, rotate after the hackathon.
- **JWT secret leakage** → same handling as the service-account credential. There is no token-revocation list in MVP; on suspected leak, rotate the secret (which invalidates every issued token).
- **Sheets row-number drift** → never delete rows; identify entities only by UUID.
- **Quota or Sheets outage** → the entire app is unavailable. Acceptable for a demo; documented as a known limit.
- **Hashtag enum drift** → if admins want to add a value, they need a backend deploy. Acceptable for MVP; revisit if it becomes painful.

## Migration Plan

Not applicable — greenfield. To make a future move off Sheets cheap, the persistence layer lives behind Java repository interfaces (`UserRepository`, `RecognitionRepository`, `RewardRepository`, `RedemptionRepository`). The Sheets-backed implementations are the only concrete classes in this proposal; a JPA implementation can replace them later without touching the service layer.

## Open Questions

- **Default monthly allowance amount.** Proposing `100` to match Bonusly's typical default. Final number is admin-configurable via `application.yml`.
- **Hashtag list for launch.** Proposing `teamwork`, `ownership`, `impact`, `kindness` as placeholders. Synacy's actual company values should replace these before the demo.
- **Reward inventory.** Proposing unlimited (a reward is always purchasable if `active=true`). Quantity limits deferred unless explicitly requested.
- **Time zone for "current month".** Proposing UTC for simplicity. Synacy is in PH (UTC+8) — if a user gives points just after midnight local on the 1st, UTC will still be the previous day. Confirm whether to switch to PH local time.
