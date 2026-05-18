## 1. Backend project setup

- [ ] 1.1 Create a Spring Boot module (Java 21, Spring Web, Spring Validation) at `backend/` with `application.yml` placeholders for the Sheets spreadsheet id, service-account credential path, JWT secret, default monthly allowance, and allowed hashtag list
- [ ] 1.2 Add the `google-api-services-sheets` and `google-auth-library-oauth2-http` dependencies and verify the project builds with `./mvnw clean package` (or Gradle equivalent)
- [ ] 1.3 Configure CORS to allow the Angular dev origin (`http://localhost:4200`) and add a global `RestControllerAdvice` that maps validation errors to HTTP 400 with a `{message}` body
- [ ] 1.4 Define the `RestController` URL prefix as `/api/v1/...`

## 2. Google Sheets integration layer

- [ ] 2.1 Build a `SheetsClient` that loads the service-account credential, opens the configured spreadsheet, and exposes typed `readRange`, `appendRow`, and `updateRow` helpers
- [ ] 2.2 Wire a single-threaded `ExecutorService` and route all write operations (`appendRow`, `updateRow`) through it so concurrent writes serialize
- [ ] 2.3 Document the expected tab + column layout (`users`, `recognitions`, `rewards`, `redemptions`) in `backend/README.md` per the table in `design.md`, decision 3
- [ ] 2.4 Add a 60-second in-memory cache for `users` (excluding `passwordHash`) and `rewards` reads
- [ ] 2.5 Provide a small seeding script or CLI command that writes the four header rows into a fresh spreadsheet so a clean install is one step

## 3. Domain: user + auth

- [ ] 3.1 Define `User` domain class and `UserRepository` interface; implement `SheetsUserRepository` against the `users` tab
- [ ] 3.2 Implement `PasswordHasher` using BCrypt (`BCryptPasswordEncoder`)
- [ ] 3.3 Implement `JwtService` (HS256, server secret from env) with `issue(userId)` and `verify(token) -> userId` methods
- [ ] 3.4 Implement `POST /api/v1/auth/login` accepting `{email, password}`, returning `{token, user: {id, email, name}}` on success, HTTP 401 with a generic message otherwise (no user-enumeration leak — satisfies `user-auth` Requirement: Email and password login)
- [ ] 3.5 Implement a Spring Security filter (or simple `OncePerRequestFilter`) that reads `Authorization: Bearer …`, verifies the JWT, and populates a `SecurityContext` with the user id; reject missing/invalid/expired tokens with HTTP 401
- [ ] 3.6 Implement `GET /api/v1/me` returning the authenticated user's profile (id, email, name, givingBalance, givingMonth, earnedBalance) and applying the lazy monthly refresh (satisfies `user-auth` Requirement: Authenticated user can fetch their own profile)

## 4. Domain: points ledger

- [ ] 4.1 Implement an `AllowanceService.refreshIfNeeded(user)` that, if `user.givingMonth != currentMonthUtc()`, sets `givingBalance = DEFAULT_ALLOWANCE` and `givingMonth = currentMonthUtc()` and persists the row (satisfies `points-ledger` Requirement: Monthly giving allowance refresh)
- [ ] 4.2 Ensure every "give" or profile-read code path invokes `refreshIfNeeded` exactly once at the entry point
- [ ] 4.3 Add a unit test that simulates a user whose `givingMonth` is the previous month and verifies refresh; add a second test that same-month users are not touched

## 5. Domain: give recognition

- [ ] 5.1 Define `Recognition` domain class and `RecognitionRepository`; implement `SheetsRecognitionRepository` (append-only)
- [ ] 5.2 Implement `RecognitionService.give(giverId, recipientIds: List<String>, amount, message, hashtags)` performing, in order: refresh giver allowance → validate `recipientIds` non-empty → validate no duplicate ids in `recipientIds` → validate every recipient id exists → validate giver id is NOT in `recipientIds` → validate `amount > 0` → validate message non-empty → validate hashtags non-empty and all in allowed list → validate `amount × recipientIds.size() ≤ givingBalance` → append one recognition row per recipient (each with a unique UUID, shared `message`/`hashtags`/`createdAt`) → debit giver `givingBalance` by `amount × recipientIds.size()` → credit each recipient's `earnedBalance` by `amount`. All steps inside a single task on the write executor so concurrent givers cannot observe a half-applied state.
- [ ] 5.3 Map each validation failure to the HTTP status + message specified in `give-recognition/spec.md`: empty recipient list → 400, duplicate recipients → 400, any recipient missing → 404 (identify the missing id(s)), self in recipient list → 400, insufficient total balance → 400, zero/negative amount → 400, empty message → 400, empty hashtags → 400, disallowed hashtag → 400. No partial fulfillment on any failure.
- [ ] 5.4 Implement `POST /api/v1/recognitions` accepting `{recipientIds: string[], amount: number, message: string, hashtags: string[]}`, calling the service, and returning HTTP 201 with the full list of created recognitions (one per recipient) on success
- [ ] 5.5 Log an ERROR with full context (giver id, full recipient id list, per-recipient amount, every recognition id appended so far, failure cause) if any sheet write after validation fails, per `give-recognition` Requirement: Recognition write is all-or-nothing
- [ ] 5.6 Unit tests covering: single-recipient happy path, multi-recipient happy path (asserts N rows appended, giver debited `amount × N`, each recipient credited `amount`), self in recipient list (alone and alongside others), duplicate recipient ids, empty recipient list, total cost exceeds giving balance (boundary: `givingBalance == amount × N − 1`), zero/negative amount, one of several recipients missing, empty message, empty hashtags, disallowed hashtag

## 6. Domain: recognition feed

- [ ] 6.1 Implement `GET /api/v1/feed?page=N&size=M` returning the most recent recognitions in reverse-chronological order with a flag indicating whether more pages exist
- [ ] 6.2 Resolve `giverId` and `recipientId` to `{id, name}` shapes in the response (use the cached `users` read; do not hit the sheet per row)
- [ ] 6.3 Default `size` to 25; cap `size` at 100 to bound memory and Sheets read volume
- [ ] 6.4 Unit test the empty-feed case, the first-page case, the past-the-end case, and the response shape

## 7. Domain: rewards catalog + redemption

- [ ] 7.1 Define `Reward` and `Redemption` domain classes and their repositories; implement `SheetsRewardRepository` (read-only at runtime; admins edit the sheet directly) and `SheetsRedemptionRepository` (append-only)
- [ ] 7.2 Implement `GET /api/v1/rewards` returning only rewards where `active = true`
- [ ] 7.3 Implement `RedemptionService.redeem(userId, rewardId)`: load reward → reject if missing or inactive (404) → reject if `earnedBalance < costPoints` (400) → append redemption row with `status = "pending"` and a snapshot of `costPoints` → debit `earnedBalance`. All steps inside the write executor.
- [ ] 7.4 Implement `POST /api/v1/redemptions` calling the service and returning HTTP 201
- [ ] 7.5 Implement `GET /api/v1/redemptions/me` returning the caller's redemption history in reverse-chronological order
- [ ] 7.6 Unit tests: successful redemption deducts the right amount, insufficient balance is rejected without write, inactive/missing reward returns 404, price snapshot is preserved across later catalog edits

## 8. Frontend: shared infrastructure

- [ ] 8.1 Create `src/environments/environment.ts` with `apiBaseUrl: 'http://localhost:8080/api/v1'`
- [ ] 8.2 Add an `AuthService` (signal-based) that owns `currentUser`, `token`, persists the token to `localStorage`, and exposes `login(email, password)` and `logout()`
- [ ] 8.3 Add an HTTP interceptor that attaches `Authorization: Bearer <token>` when a token exists, and on HTTP 401 clears the auth state and redirects to `/login`
- [ ] 8.4 Add an `AuthGuard` that redirects unauthenticated users to `/login`

## 9. Frontend: routes and pages

- [ ] 9.1 Configure routes: `/login` (public), `/feed` (default, guarded), `/give` (guarded), `/profile` (guarded), `/rewards` (guarded), `/redemptions` (guarded)
- [ ] 9.2 Build the **Login** page (email + password form, error message on failure, redirects to `/feed` on success)
- [ ] 9.3 Build the **Feed** page using a `RecognitionService` with signals; show giver name, recipient name, amount, message, hashtag chips, and a relative timestamp; implement "load more" pagination
- [ ] 9.4 Build the **Give** page: **multi-select recipient picker** (typeahead over `/api/v1/users` — add a small list endpoint if needed) that lets the giver choose one or more teammates and shows the chosen names as removable chips, amount input labelled "per recipient" with a derived "total cost = amount × recipients" preview (validated client-side against the current giving balance), message textarea, hashtag multi-select. The picker MUST exclude the giver themselves and MUST prevent picking the same recipient twice. Submit calls `POST /api/v1/recognitions` with `recipientIds: string[]`; success redirects to `/feed` and shows a toast.
- [ ] 9.5 Build the **Profile** page showing the user's name, email, current giving balance, the month it applies to, and the earned balance, all sourced from `/api/v1/me`
- [ ] 9.6 Build the **Rewards** page listing active rewards with name, image, description, cost, and a "Redeem" button disabled when `earnedBalance < costPoints`; on success refresh `earnedBalance` and show a toast
- [ ] 9.7 Build the **Redemptions** page showing the user's redemption history from `/api/v1/redemptions/me`
- [ ] 9.8 Add a simple top nav with the user's name + earned/giving balance badges and a logout button

## 10. End-to-end verification

- [ ] 10.1 Manually seed the spreadsheet with 3–5 users (one of them yours), 4 rewards, and an empty `recognitions` tab
- [ ] 10.2 Run `./mvnw spring-boot:run` and `ng serve`, log in as two different users in two browsers, give a recognition from A → B, verify it appears on the feed and that A's giving balance dropped and B's earned balance rose
- [ ] 10.3 Redeem a reward as B; verify the earned balance drops by the exact cost and a row appears in `redemptions` with `status = "pending"`
- [ ] 10.4 Manually edit a user row to set `givingMonth` to the previous month; log in and verify the giving balance refreshes to the configured default on the next profile fetch
- [ ] 10.5 Give a multi-recipient recognition (e.g., A → B + C + D, 10 points each); verify the feed shows three new entries with identical message/hashtags/timestamp, A's giving balance dropped by 30, and B, C, D each gained 10
- [ ] 10.6 Attempt a self-recognition (A in own recipient list), a recognition whose total cost exceeds A's giving balance, a recognition listing the same recipient twice, a recognition with a disallowed hashtag, and a redemption that exceeds the earned balance; verify each is rejected with the expected status and message and no row/balance was modified
- [ ] 10.7 Confirm the Sheets-as-DB demo expectation by editing a row directly in the spreadsheet and observing the change reflected in the app after the 60-second cache TTL elapses
