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

Each recognition in the feed response SHALL include the giver (id and display name), recipient (id and display name), amount, message, hashtags, and `createdAt` timestamp. The response MUST NOT include the recognition's own `id` or any other internal-only field. (Giver and recipient ids remain in the response so the client can link to user profiles; only the recognition row id is suppressed.)

#### Scenario: Recognition shape

- **WHEN** an authenticated user retrieves the feed
- **THEN** each item in the response contains exactly: `giver` (with `id`, `name`), `recipient` (with `id`, `name`), `amount`, `message`, `hashtags` (array), and `createdAt` (ISO-8601 UTC) — and does NOT contain a top-level `id` field
