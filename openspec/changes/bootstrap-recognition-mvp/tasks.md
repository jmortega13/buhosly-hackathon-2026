## 1. Backend project setup

- [x] 1.1 Create a Spring Boot module (Java 21, Spring Web, Spring Validation, Spring Security, Spring Data JPA) at `backend/` with `application.yml` containing: `spring.datasource.url` / `username` / `password` (env-var placeholders pointing at the compose Postgres by default), `spring.jpa.hibernate.ddl-auto: validate`, Flyway enabled, JWT secret (env-var placeholder), Google OAuth client id (env-var placeholder), `app.auth.allowed-domains: [synacy.com, rise.com]`, `app.allowance.default-points: 30`, `app.allowance.zone: Asia/Manila`, and `app.feed.{default-page-size,max-page-size}`. **No `app.hashtags` allowlist** — hashtags are freeform.
- [x] 1.2 Build via **Gradle (Kotlin DSL)**: `build.gradle.kts` declares Spring Boot 3.5 plus `spring-boot-starter-data-jpa`, `org.postgresql:postgresql`, `org.flywaydb:flyway-core`, `org.flywaydb:flyway-database-postgresql`, `google-api-client` (still used by `GoogleIdTokenVerifier`), and `me.paulschwarz:spring-dotenv`. Verify with `./gradlew build`.
- [x] 1.3 Configure CORS to allow the Angular dev origin (`http://localhost:4200`) and add a global `RestControllerAdvice` that maps validation errors to HTTP 400 with a `{message}` body and `OptimisticLockException` to HTTP 409 with `{"message": "conflicting concurrent update — please retry"}`.
- [x] 1.4 Define the `RestController` URL prefix as `/api/v1/...`

## 2. PostgreSQL + JPA + Flyway data layer

- [x] 2.1 Add `docker-compose.yml` at the repo root: `postgres:16-alpine`, port `5432:5432`, a named volume `pgdata`, env vars `POSTGRES_DB=buhosly POSTGRES_USER=buhosly POSTGRES_PASSWORD=buhosly`. Document `docker compose up -d` in the README.
- [x] 2.2 Create `backend/src/main/resources/db/migration/V1__init.sql` defining the four tables (`users`, `recognitions`, `rewards`, `redemptions`) per `design.md` decision 4, including: UUID primary keys, foreign-key constraints, `row_version INT NOT NULL DEFAULT 0` on `users` (for `@Version` optimistic locking), `CHECK (amount > 0)` on `recognitions.amount`, and an index on `recognitions(created_at DESC)` for the feed.
- [x] 2.3 Create `V2__seed_rewards.sql` inserting 4 demo reward rows so a fresh DB is demo-ready out of the box.
- [x] 2.3a Create `V3__hashtags.sql` defining the `hashtags` table (`tag VARCHAR(64) PRIMARY KEY CHECK (tag ~ '^[a-z0-9][a-z0-9_-]{0,63}$')`, `usage_count INT NOT NULL DEFAULT 0`, `last_used_at TIMESTAMPTZ NOT NULL`) plus an index on `(usage_count DESC, last_used_at DESC)` for the suggestion endpoint. Seed 4 starter tags (`teamwork`, `ownership`, `impact`, `kindness`) with `usage_count = 0`.
- [x] 2.3b Create `V4__seed_test_users.sql` inserting 5 demo users at `@buhosly.demo` (Maria Cruz, Juan Reyes, Anna Garcia, Carlo Santos, Bea Mendoza) with varied giving/earned balances so the `@`-mention dropdown is populated on a fresh DB. These accounts cannot sign in (domain not on the allowlist) — they exist only as recipients. Wrapped in `DO $$ … $$;` so `giving_month` is computed at apply-time in Asia/Manila.
- [x] 2.3c Create `V5__more_hashtags.sql` adding 10 broader Bonusly-style hashtag suggestions (`collaboration`, `mentorship`, `innovation`, `leadership`, `helpful`, `growth`, `customer-love`, `above-and-beyond`, `problem-solving`, `craftsmanship`) with `ON CONFLICT (tag) DO NOTHING` so the migration is idempotent.
- [ ] 2.3d Create `V6__add_gif_url.sql` adding a nullable `gif_url VARCHAR(2048)` column to `recognitions`; no index needed.
- [x] 2.4 Implement JPA `@Converter`s for `YearMonth` ↔ `VARCHAR(7)` and `List<String>` ↔ comma-separated `VARCHAR`; apply via `@Convert` on the relevant entity fields.
- [x] 2.5 Document the DB layout, env vars, and `docker compose up -d` / Flyway flow in `backend/README.md`.

## 3. Domain: user + auth

- [x] 3.1 Define the `User` `@Entity` (table `users`, columns `id email name giving_balance giving_month earned_balance created_at row_version`) and `UserRepository extends JpaRepository<User, UUID>` with `findByEmailIgnoreCase(String)` derived query.
- [x] 3.2 Implement `GoogleTokenVerifierService` that uses `GoogleIdTokenVerifier` (from `google-api-client`) to verify a posted Google ID token against the configured `app.auth.google.client-id`, requires `email_verified=true`, and exposes a method returning the verified email + name (or throws `ApiException(401, "invalid sign-in")`).
- [x] 3.3 Implement `JwtService` (HS256, server secret from env) with `issue(userId)` and `verify(token) -> userId` methods.
- [x] 3.4 Implement `POST /api/v1/auth/google` accepting `{idToken}`. Steps inside one `@Transactional` method: (1) verify the Google token. (2) lowercase email. (3) reject if domain not in allowlist (HTTP 403). (4) `userRepository.findByEmailIgnoreCase(email).orElseGet(() -> save new User row)`. (5) issue app JWT and return `{token, user: {id, email, name}}`.
- [x] 3.5 Implement a Spring Security filter (`OncePerRequestFilter`) that reads `Authorization: Bearer …`, verifies the application JWT, and populates a `SecurityContext` with the user id; reject missing/invalid/expired tokens with HTTP 401. Skip the filter for `/api/v1/auth/**`.
- [x] 3.6 Implement `GET /api/v1/me` returning the authenticated user's profile (id, email, name, givingBalance, givingMonth, earnedBalance) and applying the lazy monthly refresh.

## 4. Domain: points ledger

- [x] 4.1 Implement `AllowanceService.refreshIfNeeded(user)` that, if `user.getGivingMonth() != currentMonth("Asia/Manila")`, mutates the entity in place (`setGivingBalance(default)`, `setGivingMonth(currentMonth)`) and `userRepository.save(user)`. Uses `ZoneId.of("Asia/Manila")` explicitly — never relies on the JVM default zone.
- [x] 4.2 Ensure every "give" or profile-read code path invokes `refreshIfNeeded` exactly once at the entry point.
- [x] 4.3 Unit tests for `AllowanceService.refreshIfNeeded`: (a) previous-month is refreshed to 30 and current Asia/Manila month, (b) same-month users are not touched, (c) UTC-says-31st-but-Manila-on-1st boundary fires the refresh.

## 5. Domain: give recognition

- [x] 5.1 Define `Recognition` `@Entity` (table `recognitions`, columns `id giver_id recipient_id amount message hashtags created_at`) with the hashtags column mapped via the `StringListConverter`; `RecognitionRepository extends JpaRepository<Recognition, UUID>` with `findAllByOrderByCreatedAtDesc(Pageable)`.
- [ ] 5.2 Update `RecognitionService.give(giverId, recipientIds, amount, message, hashtags)` (annotated `@Transactional`): refresh giver allowance → validate (non-empty recipients, no duplicates, recipients exist, giver not in list, amount > 0, message non-blank, hashtags non-empty AND each matches `^[a-z0-9][a-z0-9_-]{0,63}$` after normalisation, `amount × N ≤ givingBalance`) → INSERT one recognition row per recipient + UPDATE recipient earned balances → UPDATE giver giving balance → **upsert each (de-duplicated) hashtag into the `hashtags` table via `HashtagService.recordAll`**. All inside one transaction.
- [ ] 5.3 Map each validation failure to HTTP per `give-recognition/spec.md`: empty recipient list → 400, duplicate recipients → 400, any recipient missing → 404 (identify ids), self in recipient list → 400, insufficient total balance → 400, zero/negative amount → 400, empty message → 400, empty hashtags → 400, **malformed hashtag → 400** (identify which one).
- [x] 5.4 Implement `POST /api/v1/recognitions` accepting `{recipientIds: string[], amount: number, message: string, hashtags: string[]}` and returning HTTP 201 with the list of created recognition rows.
- [x] 5.5 Translate `OptimisticLockException` (raised by the giver's `@Version` column on conflict) to HTTP 409 with `{"message": "conflicting concurrent update — please retry"}` via the global handler.
- [ ] 5.6 Unit tests covering: single-recipient happy path, multi-recipient happy path (N rows, debit `amount × N`, credit `amount` each, hashtag usage rows upserted), self alone & alongside others, duplicate recipient ids, empty recipient list, total cost exceeds giving balance (boundary), zero/negative amount, one missing recipient, empty message, empty hashtags, malformed hashtag (uppercase / spaces / starts with hyphen / too long).

## 6. Domain: recognition feed

- [x] 6.1 Implement `GET /api/v1/feed?page=N&size=M` returning the most recent recognitions in reverse-chronological order with a flag indicating whether more pages exist. Uses `findAllByOrderByCreatedAtDesc(Pageable.ofSize(size).withPage(page))`.
- [x] 6.2 Resolve `giverId` and `recipientId` to `{id, name}` shapes in the response via `userRepository.findAllById(unionOfIds)` so the feed page is one extra query, not N.
- [x] 6.3 Default `size` to 25; cap at 100 to bound memory and result size.
- [ ] 6.4 Unit test the empty-feed case, the first-page case, the past-the-end case, and the response shape (no top-level `id` on items).

## 7. Domain: rewards catalog + redemption

- [x] 7.1 Define `Reward` `@Entity` (table `rewards`) and `Redemption` `@Entity` (table `redemptions`) and their `JpaRepository` interfaces. `RewardRepository.findAllByActiveTrue()` and `RedemptionRepository.findAllByUserIdOrderByCreatedAtDesc(UUID)` are derived queries.
- [x] 7.2 Implement `GET /api/v1/rewards` returning only rewards where `active = true`.
- [x] 7.3 Implement `RedemptionService.redeem(userId, rewardId)` annotated `@Transactional`: load reward (404 if missing/inactive) → load user → reject if `earnedBalance < costPoints` (400) → INSERT redemption row with `status = "pending"` and a snapshot of `costPoints` → debit user `earnedBalance`.
- [x] 7.4 Implement `POST /api/v1/redemptions` returning HTTP 201.
- [x] 7.5 Implement `GET /api/v1/redemptions/me` returning the caller's redemption history in reverse-chronological order.
- [ ] 7.6 Unit tests: successful redemption deducts the right amount, insufficient balance is rejected without write, inactive/missing reward returns 404, `cost_points` snapshot is preserved across later catalog price edits.

## 7a. Domain: hashtag suggestions

- [ ] 7a.1 Define `Hashtag` `@Entity` (table `hashtags`, columns `tag` PK, `usage_count`, `last_used_at`) and `HashtagRepository extends JpaRepository<Hashtag, String>` with `findTop50ByTagStartingWithOrderByUsageCountDescLastUsedAtDesc(String prefix)` and `findTop50ByOrderByUsageCountDescLastUsedAtDesc()`.
- [ ] 7a.2 Implement `HashtagService.recordAll(Collection<String> tags)`: de-duplicate, then upsert each tag via a native query `INSERT INTO hashtags (tag, usage_count, last_used_at) VALUES (?, 1, ?) ON CONFLICT (tag) DO UPDATE SET usage_count = hashtags.usage_count + 1, last_used_at = EXCLUDED.last_used_at`. Called from inside `RecognitionService.give`'s transaction.
- [ ] 7a.3 Implement `GET /api/v1/hashtags?q=<prefix>` returning `[{tag, usageCount, lastUsedAt}]` (max 50, ordered per spec).
- [ ] 7a.4 Unit tests: empty store, prefix filter (case-insensitive), ordering by usage_count then last_used_at, max-50 cap.

## 7b. Domain: GIF search

- [x] 7b.1 Add `app.giphy.api-key: ${GIPHY_API_KEY:}` to `application.yml`, expose it via `AppProperties.Giphy`, and document `GIPHY_API_KEY` in `backend/.env.example`.
- [x] 7b.2 Implement `GiphyClient` using Spring's `RestClient` to call `https://api.giphy.com/v1/gifs/search?q=<query>&api_key=<key>&limit=20&rating=pg`. Map Giphy's `data[]` to a slim `[{id, previewUrl, gifUrl, alt}]` shape: `previewUrl = images.fixed_width.url`, `gifUrl = images.original.url`, `alt = title`. Handle 5xx / timeouts by raising `ApiException.serviceUnavailable("gif search temporarily unavailable")`.
- [x] 7b.3 Implement `GET /api/v1/gifs?q=<query>`: 400 if `q` is empty, 503 if `GIPHY_API_KEY` is missing, otherwise delegate to `GiphyClient`.
- [ ] 7b.4 Update `Recognition` entity to add `private String gifUrl;` (nullable) mapped to column `gif_url`; update `RecognitionService.give` signature to accept an optional `gifUrl`; validate format (`startsWith("https://")` && `length <= 2048`) and reject with HTTP 400 otherwise; persist it on every recognition row generated by the give.
- [ ] 7b.5 Update `POST /api/v1/recognitions` request body to accept an optional `gifUrl`; update the response (and the feed response) to include the field.

## 7c. Domain: admin dashboard

- [ ] 7c.1 Add `app.auth.admin-emails: List<String>` to `application.yml` (env-driven via `${ADMIN_EMAILS:}`), expose it via `AppProperties.Auth`, document it in `backend/.env.example`.
- [ ] 7c.2 Create `V8__admin_overrides.sql` adding nullable `monthly_allowance INTEGER` column to `users`; update `User` entity to carry the optional field; update `AllowanceService.refreshIfNeeded` so the monthly refresh uses `user.monthlyAllowance() != null ? user.monthlyAllowance() : props.allowance().defaultPoints()`.
- [ ] 7c.3 Update `AuthController.google`: after verifying the Google ID token and resolving the user, decide `isAdmin = props.auth().adminEmails().contains(email.toLowerCase())`; pass `isAdmin` to `JwtService.issue(userId, isAdmin)` which encodes it as an `admin: true|false` claim; include `isAdmin` in the response body's `user` object.
- [ ] 7c.4 Update `JwtAuthFilter`: parse the `admin` claim from the verified JWT and populate the `SecurityContext` authorities with `ROLE_ADMIN` when true.
- [ ] 7c.5 Update `SecurityConfig` to add `.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")` *before* `.anyRequest().authenticated()`. Non-admin requests to `/admin/**` are rejected with HTTP 403.
- [ ] 7c.6 Update `MeController.me()` to include `isAdmin` in the response (computed from `props.auth().adminEmails()` against the user's email).
- [ ] 7c.7 Implement `AdminRewardsController`: `GET /api/v1/admin/rewards` (all, including inactive, ordered by name), `POST /api/v1/admin/rewards`, `PUT /api/v1/admin/rewards/{id}`, `DELETE /api/v1/admin/rewards/{id}` (soft-delete via `active = false`). Validation: `name` non-blank, `costPoints > 0`, optional `imageUrl` must be `https://` ≤ 2048 chars.
- [ ] 7c.8 Implement `AdminUsersController`: `GET /api/v1/admin/users` (all users + balances + override), `POST /api/v1/admin/users/{id}/top-up` (applies `refreshIfNeeded` first, then adds `amount` to `giving_balance`; amount must be positive), `PUT /api/v1/admin/users/{id}/monthly-allowance` (sets the override; accepts `null` to clear). Both write endpoints `@Transactional`.
- [ ] 7c.9 Implement `AdminRedemptionsController`: `GET /api/v1/admin/redemptions` returning all redemptions joined to user + reward names, ordered by `createdAt DESC`. Plus `GET /api/v1/admin/redemptions.csv` returning the same data as RFC-4180 CSV with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="redemptions-YYYY-MM-DD.csv"`. CSV header: `id,createdAt,userEmail,userName,rewardName,costPoints,status`.

## 8. Frontend: shared infrastructure

- [x] 8.1 Create `src/environments/environment.ts` with `apiBaseUrl: 'http://localhost:8080/api/v1'` and `googleClientId`.
- [x] 8.2 Add an `AuthService` (signal-based) that owns `currentUser`, `token`, persists the token to `localStorage`, and exposes `loginWithGoogle(idToken: string)` and `logout()`. No email/password method exists.
- [x] 8.3 Add an HTTP interceptor that attaches `Authorization: Bearer <token>` when a token exists, and on HTTP 401 clears the auth state and redirects to `/login`.
- [x] 8.4 Add an `AuthGuard` that redirects unauthenticated users to `/login`.

## 9. Frontend: routes and pages

- [x] 9.1 Configure routes: `/login` (public), `/feed` (default, guarded), `/profile` (guarded), `/rewards` (guarded), `/redemptions` (guarded). The give-recognition flow lives inside `/feed` (no standalone `/give` route).
- [x] 9.2 Build the **Login** page: load Google Identity Services, render the official Google Sign-In button initialised with `environment.googleClientId`, on callback call `AuthService.loginWithGoogle(credential)`; success redirects to `/feed`. No email/password input.
- [ ] 9.3 Build the **Feed** page with the **`RecognitionComposer` pinned at the top** (above the feed list). Recognition list uses signal-based state, shows giver name, recipient name, amount, message, hashtag chips, relative timestamp; "load more" pagination.
- [ ] 9.4 Build the **`RecognitionComposer` standalone component** (mounted at the top of the Feed page):
  - Single `<textarea>` (plain, not contenteditable)
  - On every input event: scan back from the cursor for `@` or `#` (no whitespace between cursor and the trigger); if found, show a dropdown anchored below the textarea filtered by the typed prefix. Close on space, escape, or selection.
  - `@` dropdown fetches `/api/v1/users`; selection inserts `@<email-local-part>` and pushes `(handle -> uuid)` into an in-component `Map`.
  - `#` dropdown fetches `/api/v1/hashtags?q=<prefix>`; selection inserts `#<tag>`. When the typed prefix has no exact match, the dropdown's first row reads "Create new #<typed>" and inserts the typed value.
  - Parse on every keystroke: `+(\d+)` (first match) → amount; `@([a-z0-9._-]+)` → handles (resolved through the map); `#([a-z0-9_-]+)` → hashtags (lowercased, deduped); remaining text after stripping all three token classes → message.
  - Render a **live preview bar** below the textarea showing chips for parsed recipients ("Alice Cruz, Bob Diaz"), the total cost ("10 pts × 2 = 20"), and the parsed hashtag chips.
  - Submit button is enabled only when: ≥ 1 mention resolved via dropdown, `+N` present and positive, message non-blank after token-strip, ≥ 1 hashtag, total cost ≤ current giving balance.
  - On submit: POST `/api/v1/recognitions` with `{recipientIds, amount, message, hashtags, gifUrl?}`; on success, clear the textarea, clear the attached GIF, and emit a `posted` event so the host page can refresh the feed.
- [ ] 9.4a Add an **emoji picker** button to the composer (using the `emoji-picker-element` web component, registered via `CUSTOM_ELEMENTS_SCHEMA` on the composer). Clicking the button toggles a popover; selecting an emoji fires `emoji-click`, inserts the emoji's `unicode` at the textarea's current caret position, and closes the popover.
- [ ] 9.4b Add a **GIF picker** button to the composer that opens a search panel with a debounced (300 ms) text input. On change, hit `GET /api/v1/gifs?q=<query>` and render a 2-column grid of `previewUrl` thumbnails. Selecting a thumbnail attaches the GIF (store `gifUrl` + `previewUrl` in component state, render a preview below the textarea with an "×" remove button, close the panel). Submit includes `gifUrl` in the request body. Reset on successful submit.
- [ ] 9.4c Render attached GIFs in feed items: when a `FeedItem` includes `gifUrl`, render `<img [src]="item.gifUrl" alt="recognition gif">` below the message; clamp the max height in CSS so a tall GIF doesn't dominate the card.
- [x] 9.5 Build the **Profile** page from `/api/v1/me`.
- [x] 9.6 Build the **Rewards** page with a "Redeem" button disabled when `earnedBalance < costPoints`; success refreshes balance.
- [x] 9.7 Build the **Redemptions** page from `/api/v1/redemptions/me`.
- [x] 9.8 Top nav with name, giving/earned balance badges, logout button.
- [ ] 9.9 Add an `AdminGuard` that redirects non-admins to `/feed`; show the "Admin" link in the top nav only when `auth.currentUser()?.isAdmin === true`.
- [ ] 9.10 Build admin pages under `/admin`: **Users** (list + per-row "Top up" and "Set monthly allowance" forms), **Rewards** (table + "Add reward" form + inline edit + soft-delete button), **Redemptions** (table + "Export CSV" button that fetches `/admin/redemptions.csv` as a blob and triggers a browser download with a date-stamped filename).

## 10. End-to-end verification

- [ ] 10.1 `docker compose up -d` from the repo root; verify Postgres is healthy (`docker compose ps`).
- [ ] 10.2 In Google Cloud Console create an OAuth 2.0 Web client, add `http://localhost:4200` as an authorised JavaScript origin, copy the client id into `environment.googleClientId` and the `GOOGLE_CLIENT_ID` backend env var.
- [ ] 10.3 Copy `backend/.env.example` to `backend/.env` and fill in `JWT_SECRET` and `GOOGLE_CLIENT_ID`. Start the backend (`cd backend && ./gradlew bootRun`) and confirm Flyway logs `Successfully applied 2 migrations` (or current count) and the schema appears in `psql -h localhost -U buhosly -d buhosly -c '\dt'`.
- [ ] 10.4 Run `ng serve`, sign in with two `@synacy.com` / `@rise.com` Google accounts in two browsers, verify both rows appear in the `users` table via psql. Give a recognition from A → B; verify feed item appears and that `users.giving_balance` (A) dropped and `earned_balance` (B) rose.
- [ ] 10.5 Redeem a reward as B; verify `earned_balance` drops by the exact cost and a row appears in `redemptions` with `status = 'pending'`.
- [ ] 10.6 In psql, set a user's `giving_month` to the previous month (`UPDATE users SET giving_month='2026-04' WHERE email=...`); refresh `/me` and verify the balance is reset to 30 and `giving_month` advances to the current Asia/Manila month.
- [ ] 10.7 Give a multi-recipient recognition (A → B + C + D, 10 each); verify the feed shows **one card** listing all three recipients with "+10 each (30 total)", A's giving balance dropped by 30, and B, C, D each gained 10 (three rows still appear in the `recognitions` table — only the display is grouped).
- [ ] 10.8 Attempt: self-recognition (A in own recipient list), a give whose total cost exceeds A's balance, a duplicate recipient id, a disallowed hashtag, a redemption that exceeds earned balance. Verify each returns the expected status with no state change.
- [ ] 10.9 Attempt to sign in with a `@gmail.com` (non-allowlisted) Google account; verify HTTP 403 `"domain not allowed"` and no row is created in `users`.
- [ ] 10.10 (Optional) Simulate concurrent gives via two parallel curl requests sharing one giver and verify exactly one succeeds while the other returns HTTP 409 `"conflicting concurrent update — please retry"`.
- [ ] 10.11 Tear down with `docker compose down -v` to drop the volume; verify a clean `docker compose up -d` followed by backend start re-applies all Flyway migrations and the seeded rewards reappear.
