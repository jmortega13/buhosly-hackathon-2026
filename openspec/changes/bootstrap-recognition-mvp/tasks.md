## 1. Backend project setup

- [x] 1.1 Create a Spring Boot module (Java 21, Spring Web, Spring Validation, Spring Security, Spring Data JPA) at `backend/` with `application.yml` containing: `spring.datasource.url` / `username` / `password` (env-var placeholders pointing at the compose Postgres by default), `spring.jpa.hibernate.ddl-auto: validate`, Flyway enabled, JWT secret (env-var placeholder), Google OAuth client id (env-var placeholder), `app.auth.allowed-domains: [synacy.com, rise.com]`, `app.allowance.default-points: 30`, `app.allowance.zone: Asia/Manila`, `app.hashtags: [teamwork, ownership, impact, kindness]`, and `app.feed.{default-page-size,max-page-size}`.
- [x] 1.2 Add `spring-boot-starter-data-jpa`, `org.postgresql:postgresql`, `org.flywaydb:flyway-core`, and `org.flywaydb:flyway-database-postgresql` dependencies. Keep `google-api-client` (still used by `GoogleIdTokenVerifier`). Verify the project builds with `./mvnw clean package`.
- [x] 1.3 Configure CORS to allow the Angular dev origin (`http://localhost:4200`) and add a global `RestControllerAdvice` that maps validation errors to HTTP 400 with a `{message}` body and `OptimisticLockException` to HTTP 409 with `{"message": "conflicting concurrent update — please retry"}`.
- [x] 1.4 Define the `RestController` URL prefix as `/api/v1/...`

## 2. PostgreSQL + JPA + Flyway data layer

- [x] 2.1 Add `docker-compose.yml` at the repo root: `postgres:16-alpine`, port `5432:5432`, a named volume `pgdata`, env vars `POSTGRES_DB=buhosly POSTGRES_USER=buhosly POSTGRES_PASSWORD=buhosly`. Document `docker compose up -d` in the README.
- [x] 2.2 Create `backend/src/main/resources/db/migration/V1__init.sql` defining the four tables (`users`, `recognitions`, `rewards`, `redemptions`) per `design.md` decision 4, including: UUID primary keys, foreign-key constraints, `row_version INT NOT NULL DEFAULT 0` on `users` (for `@Version` optimistic locking), `CHECK (amount > 0)` on `recognitions.amount`, and an index on `recognitions(created_at DESC)` for the feed.
- [x] 2.3 Create `V2__seed_rewards.sql` inserting 4 demo reward rows so a fresh DB is demo-ready out of the box.
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
- [x] 5.2 Implement `RecognitionService.give(giverId, recipientIds, amount, message, hashtags)` annotated `@Transactional`: refresh giver allowance → validate (non-empty, no duplicates, recipients exist, giver not in list, amount > 0, message non-blank, hashtags allowed, `amount × N ≤ givingBalance`) → for each recipient INSERT a recognition row + UPDATE recipient earned balance → UPDATE giver giving balance once. Throws on any failure; transaction rolls back.
- [x] 5.3 Map each validation failure to HTTP per `give-recognition/spec.md`: empty recipient list → 400, duplicate recipients → 400, any recipient missing → 404 (identify ids), self in recipient list → 400, insufficient total balance → 400, zero/negative amount → 400, empty message → 400, empty hashtags → 400, disallowed hashtag → 400.
- [x] 5.4 Implement `POST /api/v1/recognitions` accepting `{recipientIds: string[], amount: number, message: string, hashtags: string[]}` and returning HTTP 201 with the list of created recognition rows.
- [x] 5.5 Translate `OptimisticLockException` (raised by the giver's `@Version` column on conflict) to HTTP 409 with `{"message": "conflicting concurrent update — please retry"}` via the global handler.
- [ ] 5.6 Unit tests covering: single-recipient happy path, multi-recipient happy path (N rows, debit `amount × N`, credit `amount` each), self alone & alongside others, duplicate recipient ids, empty recipient list, total cost exceeds giving balance (boundary), zero/negative amount, one missing recipient, empty message, empty hashtags, disallowed hashtag.

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

## 8. Frontend: shared infrastructure

- [x] 8.1 Create `src/environments/environment.ts` with `apiBaseUrl: 'http://localhost:8080/api/v1'` and `googleClientId`.
- [x] 8.2 Add an `AuthService` (signal-based) that owns `currentUser`, `token`, persists the token to `localStorage`, and exposes `loginWithGoogle(idToken: string)` and `logout()`. No email/password method exists.
- [x] 8.3 Add an HTTP interceptor that attaches `Authorization: Bearer <token>` when a token exists, and on HTTP 401 clears the auth state and redirects to `/login`.
- [x] 8.4 Add an `AuthGuard` that redirects unauthenticated users to `/login`.

## 9. Frontend: routes and pages

- [x] 9.1 Configure routes: `/login` (public), `/feed` (default, guarded), `/give` (guarded), `/profile` (guarded), `/rewards` (guarded), `/redemptions` (guarded).
- [x] 9.2 Build the **Login** page: load Google Identity Services, render the official Google Sign-In button initialised with `environment.googleClientId`, on callback call `AuthService.loginWithGoogle(credential)`; success redirects to `/feed`. No email/password input.
- [x] 9.3 Build the **Feed** page: signal-based service, show giver name, recipient name, amount, message, hashtag chips, relative timestamp; "load more" pagination.
- [x] 9.4 Build the **Give** page: multi-select recipient picker (typeahead over `/api/v1/users`), amount-per-recipient input with total-cost preview validated against the giving balance, message textarea, hashtag multi-select. Picker excludes self and prevents duplicate selection. Submit calls `POST /api/v1/recognitions` with `recipientIds: string[]`.
- [x] 9.5 Build the **Profile** page from `/api/v1/me`.
- [x] 9.6 Build the **Rewards** page with a "Redeem" button disabled when `earnedBalance < costPoints`; success refreshes balance.
- [x] 9.7 Build the **Redemptions** page from `/api/v1/redemptions/me`.
- [x] 9.8 Top nav with name, giving/earned balance badges, logout button.

## 10. End-to-end verification

- [ ] 10.1 `docker compose up -d` from the repo root; verify Postgres is healthy (`docker compose ps`).
- [ ] 10.2 In Google Cloud Console create an OAuth 2.0 Web client, add `http://localhost:4200` as an authorised JavaScript origin, copy the client id into `environment.googleClientId` and the `GOOGLE_CLIENT_ID` backend env var.
- [ ] 10.3 Export `JWT_SECRET=$(openssl rand -base64 48)`. Start the backend (`cd backend && ./mvnw spring-boot:run`) and confirm Flyway logs `Successfully applied 2 migrations` (or current count) and the schema appears in `psql -h localhost -U buhosly -d buhosly -c '\dt'`.
- [ ] 10.4 Run `ng serve`, sign in with two `@synacy.com` / `@rise.com` Google accounts in two browsers, verify both rows appear in the `users` table via psql. Give a recognition from A → B; verify feed item appears and that `users.giving_balance` (A) dropped and `earned_balance` (B) rose.
- [ ] 10.5 Redeem a reward as B; verify `earned_balance` drops by the exact cost and a row appears in `redemptions` with `status = 'pending'`.
- [ ] 10.6 In psql, set a user's `giving_month` to the previous month (`UPDATE users SET giving_month='2026-04' WHERE email=...`); refresh `/me` and verify the balance is reset to 30 and `giving_month` advances to the current Asia/Manila month.
- [ ] 10.7 Give a multi-recipient recognition (A → B + C + D, 10 each); verify three new entries with identical message/hashtags/created_at and that A's giving balance dropped by 30 while B, C, D each gained 10.
- [ ] 10.8 Attempt: self-recognition (A in own recipient list), a give whose total cost exceeds A's balance, a duplicate recipient id, a disallowed hashtag, a redemption that exceeds earned balance. Verify each returns the expected status with no state change.
- [ ] 10.9 Attempt to sign in with a `@gmail.com` (non-allowlisted) Google account; verify HTTP 403 `"domain not allowed"` and no row is created in `users`.
- [ ] 10.10 (Optional) Simulate concurrent gives via two parallel curl requests sharing one giver and verify exactly one succeeds while the other returns HTTP 409 `"conflicting concurrent update — please retry"`.
- [ ] 10.11 Tear down with `docker compose down -v` to drop the volume; verify a clean `docker compose up -d` followed by backend start re-applies all Flyway migrations and the seeded rewards reappear.
