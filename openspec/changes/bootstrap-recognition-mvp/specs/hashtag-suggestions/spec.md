## ADDED Requirements

### Requirement: Hashtag suggestion endpoint

The system SHALL expose `GET /api/v1/hashtags` returning the list of previously-used hashtags ordered by `usage_count DESC, last_used_at DESC`. The endpoint accepts an optional `q` query parameter; when present, the system MUST return only tags whose `tag` value starts with the (lowercased) `q` value. The response MUST be capped at 50 items. The endpoint MUST require an authenticated session like every other read endpoint.

#### Scenario: Listing top hashtags

- **WHEN** an authenticated user calls `GET /api/v1/hashtags` without a `q` parameter
- **THEN** the system responds with HTTP 200 and a JSON array of up to 50 items, each `{tag: string, usageCount: number, lastUsedAt: string}`, ordered by `usageCount` descending and `lastUsedAt` descending for ties

#### Scenario: Filtering by prefix

- **WHEN** an authenticated user calls `GET /api/v1/hashtags?q=team`
- **THEN** the response contains only tags whose `tag` value starts with `team` (case-insensitive on the input), ordered the same way

#### Scenario: Empty store

- **WHEN** no recognitions have been given yet
- **THEN** the response is HTTP 200 with an empty array

#### Scenario: Unauthenticated request

- **WHEN** the request omits a valid `Authorization: Bearer …` header
- **THEN** the system responds with HTTP 401

### Requirement: Hashtag store grows from recognition usage

The `hashtags` store SHALL be the canonical source of hashtag suggestions. New entries appear in it as a side effect of the [[give-recognition]] flow; the suggestion endpoint MUST NOT depend on any administrative seeding to function. (An optional seed migration `V3` MAY pre-populate a small starter set so a brand-new database isn't completely empty.)

#### Scenario: Fresh database with no recognitions

- **WHEN** the application starts against a freshly migrated database with no recognitions yet, and an authenticated user calls `GET /api/v1/hashtags`
- **THEN** the response is HTTP 200 with either an empty array OR the starter seed values (the choice is an implementation detail, but the endpoint MUST function correctly without any extra setup)

#### Scenario: First recognition seeds suggestions

- **WHEN** the database has no `hashtags` rows, a user posts a recognition with `["#mentorship", "#kindness"]`, and another user then calls `GET /api/v1/hashtags`
- **THEN** the response includes both `mentorship` and `kindness` with `usageCount = 1`
