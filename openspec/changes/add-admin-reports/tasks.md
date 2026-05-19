## 1. Backend: reports endpoints

- [ ] 1.1 Create `AdminReportsController` in `backend/src/main/java/com/synacy/buhosly/admin/` mapped to `/api/v1/admin/reports`. Inject `RecognitionRepository` and `UserRepository`.
- [ ] 1.2 Add a private helper `Instant windowStart(String window)` that returns `null` for `"all"`, the first instant of the current Asia/Manila month for `"month"` (default when `null` / blank), and throws `ApiException.badRequest("window must be 'month' or 'all'")` otherwise. Reuse `ZoneId.of("Asia/Manila")` like `AllowanceService`.
- [ ] 1.3 Implement `GET /api/v1/admin/reports/hashtags` with optional `window` query param. Load all recognitions (paged or `findAll()` — fine at hackathon scale), filter by `createdAt >= windowStart` when non-null, then aggregate per de-duplicated tag: `recognitionCount`, `pointsTotal` (sum of amounts), `lastUsedAt` (max `createdAt`). Sort by `(recognitionCount DESC, pointsTotal DESC, lastUsedAt DESC)` and cap at 20.
- [ ] 1.4 Implement `GET /api/v1/admin/reports/leaderboard` with optional `window` query param. Aggregate recognitions by `recipientId` → `(pointsReceived, recognitionCount)`. Join to `UserRepository.findAllById(ids)` to expand into `{user: {id, name, email}, pointsReceived, recognitionCount}`. Sort by `(pointsReceived DESC, recognitionCount DESC, name ASC)` and cap at 10. Drop entries whose user record no longer exists (safety).
- [ ] 1.5 Both endpoints return `List<Map<String, Object>>` shaped like the existing admin controllers; rely on `SecurityConfig` to enforce `ROLE_ADMIN`.

## 2. Frontend: types + API service

- [ ] 2.1 Add two row types to `src/app/core/types.ts`: `HashtagReportRow {tag, recognitionCount, pointsTotal, lastUsedAt}` and `LeaderboardRow {user: {id, name, email}, pointsReceived, recognitionCount}`. Add a `ReportWindow` literal type `'month' | 'all'`.
- [ ] 2.2 Add two methods to `src/app/core/api.service.ts`: `adminReportHashtags(window: ReportWindow)` → `GET /admin/reports/hashtags?window=...`; `adminReportLeaderboard(window: ReportWindow)` → `GET /admin/reports/leaderboard?window=...`. Match the import + shape conventions used by `adminRedemptions` and friends.

## 3. Frontend: Reports page + admin nav

- [ ] 3.1 Create `src/app/pages/admin/admin-reports/admin-reports.ts` as a standalone Angular component. Use `signal()` for `window`, `hashtags`, `leaders`, `loading`, `error` — same style as `admin-redemptions.ts`. Default `window` is `'month'`.
- [ ] 3.2 Template:
  - Render `<app-admin-tabs />`.
  - A header row: `<h2>Recognition reports</h2>` + a segmented toggle (`This month` / `All time`) bound to `window()`.
  - Two cards side-by-side (stack on narrow viewports via CSS grid `repeat(auto-fit, minmax(360px, 1fr))`):
    - **Top hashtags**: table with columns `#tag`, `Recognitions`, `Points`, `Last used` (use the `date` pipe, format `'mediumDate'`).
    - **Top earners**: ordered list / table with rank (1..N), name + email, `Points received`, `Recognitions`.
  - Loading state, error state, empty state ("No activity in this window yet." shown only when both lists are empty after load).
- [ ] 3.3 On `window` change, re-fetch both endpoints in parallel via `forkJoin` (or two `subscribe`s with a shared `loading` signal). Cancel in-flight requests on rapid toggle by tracking a request-generation counter and ignoring stale responses.
- [ ] 3.4 Style with the existing `--rise-*` tokens — table styling can mirror `admin-redemptions.ts` (rounded card, pink-tint `<th>`, dashed separators).
- [ ] 3.5 Register the route in `src/app/app.routes.ts`: add a `{ path: 'admin/reports', canActivate: [adminGuard], loadComponent: ... }` entry alongside the other admin routes.
- [ ] 3.6 Add a `<a routerLink="/admin/reports" routerLinkActive="active">Reports</a>` link to `src/app/pages/admin/admin-tabs/admin-tabs.ts` after the Redemptions link.

## 4. Verification

- [ ] 4.1 Build the backend (`./gradlew build` or the project's standard command) — confirm no compile or test failures.
- [ ] 4.2 Build the frontend (`npm run build`) — confirm no TypeScript or template errors.
- [ ] 4.3 Manual smoke test with the dev server: sign in as an admin email, click the **Reports** tab, confirm both lists populate, flip the toggle and confirm both lists re-fetch.
