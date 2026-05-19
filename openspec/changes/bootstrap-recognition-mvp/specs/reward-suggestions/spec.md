## ADDED Requirements

### Requirement: Submit a reward suggestion

Any authenticated user SHALL be able to submit a reward suggestion via `POST /api/v1/suggestions`. The request MUST include a non-blank `name` (length ≤ 100); `description` and `imageUrl` are optional. On successful submit the system MUST persist the suggestion with `status = "open"`, set `suggestedByUserId` to the requester, and atomically record a vote from the requester (so the submitter automatically counts as the first supporter). The response is HTTP 201 with the new suggestion shape including a `voteCount` of 1 and `hasVoted = true`.

#### Scenario: Successful suggestion

- **WHEN** an authenticated user POSTs `{name: "Beach trip!", description: "...", imageUrl: ""}` to `/api/v1/suggestions`
- **THEN** the system inserts a row into `reward_suggestions` with `status = "open"`, inserts a vote from the requester into `reward_suggestion_votes`, and returns HTTP 201 with `{id, name, description, imageUrl, suggestedBy: {id, name}, voteCount: 1, hasVoted: true, status: "open", createdAt}`

#### Scenario: Blank name

- **WHEN** an authenticated user POSTs a suggestion whose `name` is empty, whitespace-only, or longer than 100 characters
- **THEN** the system responds with HTTP 400 with a message identifying the field

#### Scenario: Malformed image URL

- **WHEN** the optional `imageUrl` field is provided but does not start with `https://` or exceeds 2048 characters
- **THEN** the system responds with HTTP 400 with the message "imageUrl must be a valid https URL"

### Requirement: List open suggestions

The system SHALL expose `GET /api/v1/suggestions` returning every suggestion currently in `status = "open"`, ordered by `voteCount DESC` then `createdAt DESC` for ties. Each item MUST include the suggester's id and display name (joined from `users`), the `voteCount`, and a `hasVoted` flag computed against the requester's id.

#### Scenario: Listing with votes

- **WHEN** an authenticated user calls `GET /api/v1/suggestions`
- **THEN** the response is HTTP 200 with an array of suggestion objects in the shape above, ordered by vote count descending and creation time descending for tied counts; `hasVoted` reflects whether the requester is in the suggestion's vote set

#### Scenario: Empty store

- **WHEN** there are no open suggestions
- **THEN** the response is HTTP 200 with an empty array

### Requirement: Toggle a vote on a suggestion

The system SHALL expose `POST /api/v1/suggestions/{id}/vote` to toggle the requester's vote on the target suggestion. If the requester has not yet voted, a new vote row is inserted; if they have, the existing vote is removed. The operation MUST be idempotent in terms of intent (calling twice returns the user to the original state) and MUST run inside a transaction so the `voteCount` returned in the response is consistent. Voting is only allowed on `status = "open"` suggestions.

#### Scenario: First vote

- **WHEN** an authenticated user calls `POST /api/v1/suggestions/{id}/vote` on an open suggestion they haven't voted on yet
- **THEN** the system inserts a vote row, returns HTTP 200 with the updated suggestion (`voteCount` increased by one, `hasVoted = true`)

#### Scenario: Toggle off

- **WHEN** an authenticated user calls the vote endpoint on a suggestion they have already voted on
- **THEN** the system removes their vote row, returns HTTP 200 with the updated suggestion (`voteCount` decreased by one, `hasVoted = false`)

#### Scenario: Cannot vote on closed suggestion

- **WHEN** an authenticated user calls the vote endpoint on a suggestion with `status` `promoted` or `dismissed`
- **THEN** the system responds with HTTP 409 with the message "suggestion is no longer open"

### Requirement: Delete own suggestion

The system SHALL expose `DELETE /api/v1/suggestions/{id}` permitting the suggester (or any admin) to remove an open suggestion. The DB-level `ON DELETE CASCADE` on `reward_suggestion_votes.suggestion_id` MUST handle the vote cleanup. A non-suggester non-admin MUST receive HTTP 403.

#### Scenario: Suggester deletes own suggestion

- **WHEN** the suggester of an open suggestion calls `DELETE /api/v1/suggestions/{id}`
- **THEN** the system removes the suggestion row (cascade deletes the votes) and responds with HTTP 204

#### Scenario: Admin deletes someone else's suggestion

- **WHEN** an admin calls `DELETE /api/v1/suggestions/{id}` on a suggestion they didn't submit
- **THEN** the system removes the suggestion row and responds with HTTP 204

#### Scenario: Non-suggester non-admin tries to delete

- **WHEN** a regular user calls the delete endpoint on someone else's suggestion
- **THEN** the system responds with HTTP 403 with the message "only the suggester or an admin can delete"

### Requirement: Admin lists every suggestion

The system SHALL expose `GET /api/v1/admin/suggestions` returning every suggestion regardless of status, ordered by `createdAt DESC`. Each item includes the same fields as the user-facing listing plus the current `status` and (for promoted suggestions) `promotedRewardId`. Non-admin requests receive HTTP 403 via the standard `/admin/**` gate.

#### Scenario: Admin lists all suggestions

- **WHEN** an admin calls `GET /api/v1/admin/suggestions`
- **THEN** the response is HTTP 200 with every suggestion row, ordered newest first

### Requirement: Admin promotes a suggestion into a real reward

The system SHALL expose `POST /api/v1/admin/suggestions/{id}/promote` accepting `{costPoints, imageUrl?}` (costPoints positive integer; imageUrl optional, must be `https://` if provided and overrides the suggestion's own imageUrl). The operation MUST be `@Transactional` and atomically:

1. Validate the source suggestion is `status = "open"` (otherwise HTTP 409)
2. INSERT a new `Reward` row using the suggestion's name + description, the request's `costPoints`, and `imageUrl` (request overrides suggestion's value; falls back to the suggestion's `imageUrl`); `active = true`
3. UPDATE the suggestion: `status = "promoted"`, `promoted_reward_id = <new reward's id>`

#### Scenario: Successful promote

- **WHEN** an admin POSTs `{costPoints: 100, imageUrl: "https://..."}` to `/api/v1/admin/suggestions/{id}/promote` on an open suggestion
- **THEN** a new row appears in `rewards` (active, with the supplied cost), the suggestion's status flips to `promoted` and `promoted_reward_id` links to the new reward, and the response is HTTP 201 with the new reward

#### Scenario: Promote rejected on non-open suggestion

- **WHEN** an admin tries to promote a suggestion that is already `promoted` or `dismissed`
- **THEN** the system responds with HTTP 409 with the message "suggestion is no longer open"; no reward is created

#### Scenario: Invalid cost

- **WHEN** the request body has `costPoints <= 0` or missing
- **THEN** the system responds with HTTP 400 with the message "costPoints must be a positive integer"

### Requirement: Admin dismisses a suggestion

The system SHALL expose `POST /api/v1/admin/suggestions/{id}/dismiss` to mark a suggestion as `dismissed`. Only `open` suggestions are eligible (409 otherwise). Dismissing does NOT delete the row or its votes — the audit trail is preserved.

#### Scenario: Successful dismiss

- **WHEN** an admin calls `/api/v1/admin/suggestions/{id}/dismiss` on an open suggestion
- **THEN** the system sets `status = "dismissed"` and responds with HTTP 200 with the updated suggestion; votes remain in place for audit

#### Scenario: Dismiss rejected on non-open suggestion

- **WHEN** an admin tries to dismiss a `promoted` or `dismissed` suggestion
- **THEN** the system responds with HTTP 409 with the message "suggestion is no longer open"
