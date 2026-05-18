## ADDED Requirements

### Requirement: Admin allowlist gates every admin endpoint

The system SHALL recognise as an admin any authenticated user whose verified email appears (case-insensitively) in the `app.auth.admin-emails` configuration list. Every endpoint under `/api/v1/admin/**` MUST require ROLE_ADMIN; non-admin requests MUST receive HTTP 403 with the message "admin only". The login response and the `/me` endpoint SHALL include a boolean `isAdmin` so the frontend can show or hide admin UI.

#### Scenario: Admin user signs in and sees the admin flag

- **WHEN** a user whose email is in `app.auth.admin-emails` posts a valid Google ID token to `/api/v1/auth/google`
- **THEN** the response includes `user.isAdmin: true` and the issued JWT carries an `admin: true` claim that the request filter translates into the `ROLE_ADMIN` authority

#### Scenario: Non-admin attempts an admin endpoint

- **WHEN** an authenticated user without ROLE_ADMIN calls any endpoint under `/api/v1/admin/**`
- **THEN** the system responds with HTTP 403 and the message "admin only"

#### Scenario: Admin allowlist is empty

- **WHEN** `app.auth.admin-emails` is not configured (or is empty) and any user calls an admin endpoint
- **THEN** the system responds with HTTP 403 — there are no admins until at least one email is added to the allowlist

### Requirement: Rewards catalog management

The system SHALL expose admin endpoints to list every reward (including inactive), create a new reward, update an existing reward, and soft-delete a reward (set `active = false`). Hard-deletion is NOT supported because existing redemptions reference the reward by id.

#### Scenario: Admin lists rewards

- **WHEN** an admin calls `GET /api/v1/admin/rewards`
- **THEN** the response includes every reward in the database, both active and inactive, ordered by `name`

#### Scenario: Admin creates a reward

- **WHEN** an admin POSTs `{name, description, costPoints, imageUrl}` to `/api/v1/admin/rewards`
- **THEN** the system validates that `name` is non-blank, `costPoints` is a positive integer, and (if provided) `imageUrl` is a valid https URL ≤ 2048 characters; inserts a new row with a server-generated UUID and `active = true`; and returns HTTP 201 with the created reward

#### Scenario: Admin updates a reward

- **WHEN** an admin PUTs `{name, description, costPoints, imageUrl, active}` to `/api/v1/admin/rewards/{id}`
- **THEN** the system updates the row's editable fields and returns HTTP 200 with the updated reward; existing redemptions that reference this reward are unaffected (their `cost_points` snapshot is preserved)

#### Scenario: Admin soft-deletes a reward

- **WHEN** an admin DELETEs `/api/v1/admin/rewards/{id}`
- **THEN** the system sets `active = false` on the row (does NOT remove it from the table) and returns HTTP 204; subsequent calls to `GET /api/v1/rewards` exclude this reward

### Requirement: User allowance management

The system SHALL expose admin endpoints to (a) **top up** an individual user's current-month giving balance by a positive amount, and (b) **set a persistent monthly-allowance override** that replaces the configured default for that user starting on the next month rollover. The override is stored as a nullable `monthly_allowance` column on `users` (NULL = use `app.allowance.default-points`).

#### Scenario: Admin tops up a user's giving balance

- **WHEN** an admin POSTs `{amount: 25}` to `/api/v1/admin/users/{id}/top-up`
- **THEN** the system applies the lazy monthly refresh to the target user, then increments their `giving_balance` by exactly 25, and returns HTTP 200 with the user's new profile

#### Scenario: Top-up rejected when amount is non-positive

- **WHEN** an admin POSTs `{amount: 0}` or `{amount: -5}` to the top-up endpoint
- **THEN** the system responds with HTTP 400 with the message "amount must be a positive integer"

#### Scenario: Admin sets a persistent monthly-allowance override

- **WHEN** an admin PUTs `{monthlyAllowance: 100}` to `/api/v1/admin/users/{id}/monthly-allowance`
- **THEN** the system sets the user's `monthly_allowance` column to 100; the current-month `giving_balance` is NOT changed; on the next month rollover the lazy refresh sets `giving_balance` to 100 instead of the default

#### Scenario: Admin clears a persistent monthly-allowance override

- **WHEN** an admin PUTs `{monthlyAllowance: null}` to `/api/v1/admin/users/{id}/monthly-allowance`
- **THEN** the system sets `monthly_allowance` to NULL; future monthly refreshes use `app.allowance.default-points` again

#### Scenario: Override rejected when non-positive

- **WHEN** an admin PUTs `{monthlyAllowance: 0}` or a negative value to the monthly-allowance endpoint
- **THEN** the system responds with HTTP 400 with the message "monthlyAllowance must be a positive integer or null"

### Requirement: Org-wide redemption viewer

The system SHALL expose `GET /api/v1/admin/redemptions` returning every redemption across the org, in reverse-chronological order, joined to the redeemer's name + email and the reward's name. The response shape per item is `{id, user: {id, name, email}, reward: {id, name}, costPoints, createdAt, status}`.

#### Scenario: Admin lists every redemption

- **WHEN** an admin calls `GET /api/v1/admin/redemptions`
- **THEN** the response is HTTP 200 with an array of redemption objects covering every row in the `redemptions` table, ordered by `createdAt DESC`

### Requirement: CSV export of redemptions

The system SHALL expose `GET /api/v1/admin/redemptions.csv` returning the same data as the JSON listing but encoded as a CSV file. The response MUST set `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="redemptions-YYYY-MM-DD.csv"`. The CSV MUST have a header row `id,createdAt,userEmail,userName,rewardName,costPoints,status` and one data row per redemption. The file can be opened directly in Google Sheets via File → Import.

#### Scenario: Admin downloads the CSV

- **WHEN** an admin calls `GET /api/v1/admin/redemptions.csv`
- **THEN** the response is HTTP 200 with `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="redemptions-YYYY-MM-DD.csv"` (the date stamped at the moment of the request), a header row, and one row per redemption

#### Scenario: CSV quoting handles commas and quotes in user-provided fields

- **WHEN** a user's name contains a comma (e.g., `Manuel Ortega, Jr.`) or a reward name contains a double-quote
- **THEN** the CSV cell is wrapped in double quotes and embedded double-quotes are escaped by doubling (RFC 4180), so spreadsheet importers parse the row correctly
