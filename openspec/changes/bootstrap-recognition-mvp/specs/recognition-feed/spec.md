## ADDED Requirements

### Requirement: Public reverse-chronological feed

The system SHALL expose an endpoint that returns all recognitions across the organization in reverse-chronological order (newest first). The feed MUST be visible to every authenticated user — there is no per-user filtering or privacy scoping in MVP.

#### Scenario: Feed lists recent recognitions

- **WHEN** an authenticated user requests the feed
- **THEN** the system responds with a page of recognitions ordered from newest `createdAt` to oldest

#### Scenario: Empty state

- **WHEN** there are no recognitions yet
- **THEN** the system responds with HTTP 200 and an empty list

### Requirement: Pagination

The feed endpoint SHALL support page-based reads to avoid loading the entire `recognitions` sheet on every request. The default page size MUST be configurable, with a reasonable default (e.g., 25). The endpoint MUST accept a `page` (or cursor) parameter and MUST indicate whether more pages exist.

#### Scenario: First page

- **WHEN** an authenticated user requests the feed without specifying a page
- **THEN** the system returns the most recent `pageSize` recognitions and indicates whether more pages exist

#### Scenario: Subsequent page

- **WHEN** an authenticated user requests the next page
- **THEN** the system returns the next `pageSize` older recognitions and indicates whether more pages exist

#### Scenario: Past the end

- **WHEN** an authenticated user requests a page beyond the last available recognition
- **THEN** the system responds with HTTP 200 and an empty list, and indicates that no more pages exist

### Requirement: Display fields

Each feed entry SHALL include the giver (id and display name), a `recipients` array of `{id, name}` objects, `amount` (per-recipient), `totalAmount` (`amount × recipients.length`), message, hashtags, `createdAt` timestamp, and an optional `gifUrl` (present when the recognition has an attached GIF; null or absent otherwise). The response MUST NOT include the recognition rows' own ids or any other internal-only field. (Giver and recipient ids remain in the response so the client can link to user profiles; only the recognition row id is suppressed.)

A multi-recipient give produces N rows in the `recognitions` table (one per recipient) but the feed endpoint SHALL collapse them into a **single** feed entry by grouping rows that share `(giverId, createdAt)`.

#### Scenario: Recognition shape

- **WHEN** an authenticated user retrieves the feed
- **THEN** each item in the response contains: `giver` (with `id`, `name`), `recipients` (array of `{id, name}`), `amount` (per recipient), `totalAmount`, `message`, `hashtags` (array), `createdAt` (ISO-8601 UTC), and `gifUrl` (string or null) — and does NOT contain a top-level `id` field

#### Scenario: Multi-recipient give appears as one feed entry

- **WHEN** giver A submitted a recognition with recipients [B, C, D] in one give, resulting in three rows in the `recognitions` table sharing the same `(giver_id, created_at)`
- **THEN** the feed returns ONE item with `recipients = [{id: B…, name: …}, {id: C…, name: …}, {id: D…, name: …}]`, `amount` equal to the per-recipient amount, and `totalAmount` equal to `amount × 3`
