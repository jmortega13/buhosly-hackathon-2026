## Why

Synacy needs an internal peer-recognition tool so teammates can publicly appreciate each other's work and convert that recognition into tangible rewards. We are modeling the experience on Bonusly because the mechanic of a refreshing monthly point allowance — points you must give away or lose — has been validated to drive ongoing recognition rather than one-off shout-outs. This proposal bootstraps the MVP for a hackathon timeline: enough to demo the core loop (give → feed → earn → redeem) end-to-end, without integrations or admin tooling.

## What Changes

- Add user authentication via **Google Sign-In only** — no passwords, no email/password form, no self-signup form. Users sign in with their Google account; the server verifies the Google ID token and exchanges it for an application JWT. Allowed email domains: `synacy.com` and `rise.com`. First-time sign-in **just-in-time creates** a new user row using the name + email from Google; subsequent sign-ins reuse that row. Each user has an identity, a giving balance, and an earned balance.
- Add a monthly **giving allowance** that refreshes on the 1st of each month; unused allowance expires (it does not roll over).
- Add the ability to **give recognition** through a single **Bonusly-style composer** pinned at the top of the feed page: one textarea where the user types `@` to pick recipients (typeahead over org members), `+N` inline to set the per-recipient amount, and `#` to attach hashtags (typeahead over previously-used hashtags, with a "create new" option). Hashtags are **freeform** — there is no fixed allowlist; any tag a user creates becomes a suggestion for everyone else. Each recipient receives the full `amount`; the giver's allowance is debited by `amount × number of recipients`, which must fit within the giver's remaining monthly allowance.
- Add **emoji and GIF attachments** to the composer: an emoji picker button opens a full Unicode picker (`emoji-picker-element`) and inserts the selected emoji at the caret in the textarea; a GIF picker button opens a search panel backed by the Giphy API (proxied through the backend so the API key stays server-side) and attaches the chosen GIF to the recognition. The recognition row carries an optional `gifUrl`; the feed renders the GIF below the message when present.
- Add a chronological **public recognition feed** showing every recognition with giver, recipient, amount, message, and hashtags.
- Add an **earned balance** that accumulates points received and is separate from the giving allowance (earned points do not expire).
- Add a **rewards catalog** with a fixed set of redeemable items and a redemption action that deducts from the earned balance.
- Persist all of the above through a Spring Boot API backed by **PostgreSQL 16** via Spring Data JPA, with Flyway-managed schema migrations. One table per entity (`users`, `recognitions`, `rewards`, `redemptions`). Local Postgres runs via `docker-compose.yml` at the repo root.

Out of scope for this proposal: Slack/Teams integrations, add-on/pile-on points, comments, admin analytics, HRIS sync, email notifications, and audit/export tooling. (Password reset is not applicable — there are no passwords.)

## Capabilities

### New Capabilities

- `user-auth`: Identity and session management for Synacy employees, including the per-user giving allowance and earned balance fields.
- `points-ledger`: Rules for the monthly giving allowance (refresh, expiry) and the earned balance (accumulation, deduction on redemption). Source of truth for "can this user afford this action?" checks.
- `give-recognition`: The action of one user awarding points to another via the composer (`@` mention, `+N` amount, `#` hashtag), including validation of recipients, amount, message, and at least one hashtag.
- `recognition-feed`: Read-only, reverse-chronological public listing of all recognitions across the organization, with the give-recognition composer pinned at the top.
- `rewards-catalog`: Listing of available rewards and the redemption flow that debits the earned balance and records a redemption.
- `hashtag-suggestions`: A persistent set of hashtags that grows whenever any user uses a tag in a recognition, exposed via an API the composer uses to drive its `#` typeahead.
- `gif-search`: A server-proxied GIF search powered by the Giphy API. The composer hits a backend endpoint with a query string; the backend forwards to Giphy using a server-side API key and returns a slim `{id, previewUrl, gifUrl, alt}` shape.

### Modified Capabilities

<!-- None — this is the initial bootstrap; no prior specs exist. -->

## Impact

- **New code (frontend)**: Angular routes/components for login, feed, give-recognition form, profile (showing both balances), rewards catalog, and redemption history. Auth interceptor + auth guard. Shared HTTP service layer pointing at the Spring Boot API.
- **New code (backend)**: Spring Boot service with REST endpoints for auth, users, recognitions, rewards, and redemptions. JPA entities + Spring Data repositories backed by PostgreSQL. Domain services that enforce allowance/balance rules inside `@Transactional` boundaries.
- **External dependencies**: `spring-boot-starter-data-jpa`, `postgresql` (JDBC driver), `flyway-core` + `flyway-database-postgresql` (schema migrations), and the existing `google-api-client` (still used for `GoogleIdTokenVerifier` on sign-in). Local DB via `docker-compose.yml` (postgres:16 + named volume).
- **Data store**: PostgreSQL `buhosly` database with four tables (`users`, `recognitions`, `rewards`, `redemptions`). Schema is owned by Flyway migrations; details in design.md.
- **Operational risks**: Postgres concurrency is handled by DB transactions; the main remaining concern is read-modify-write races on user balances under simultaneous gives. Mitigation in design.md.
- **Affected systems**: None pre-existing; this is greenfield. Future work will likely revisit auth (Synacy SSO with broader scope), Postgres deployment (managed instance), and migration tooling once the MVP is validated.
