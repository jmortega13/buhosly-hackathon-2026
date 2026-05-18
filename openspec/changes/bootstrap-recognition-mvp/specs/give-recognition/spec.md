## ADDED Requirements

### Requirement: Create a recognition for one or more recipients

The system SHALL allow an authenticated user (the giver) to create a recognition that awards points to one or more other users (the recipients). The request MUST include a non-empty list of recipient identifiers, a positive integer `amount` interpreted as the points awarded **to each recipient**, a non-empty message, and at least one hashtag drawn from the configured list of company values. The total cost charged to the giver SHALL be `amount × number of recipients`.

#### Scenario: Single-recipient recognition succeeds

- **WHEN** an authenticated user POSTs a valid recognition with exactly one recipient (the recipient exists, `amount ≤ remaining giving balance`, message non-empty, at least one allowed hashtag)
- **THEN** the system appends one row to the `recognitions` sheet with a server-generated UUID, decrements the giver's `givingBalance` by `amount`, increments the recipient's `earnedBalance` by `amount`, and returns HTTP 201 with the created recognition

#### Scenario: Multi-recipient recognition succeeds

- **WHEN** an authenticated user with `givingBalance ≥ amount × N` POSTs a valid recognition listing `N` distinct existing recipients (all other validations pass)
- **THEN** the system appends `N` separate rows to the `recognitions` sheet — one per `(giver, recipient)` pair, each with a unique UUID but sharing the same `message`, `hashtags`, and `createdAt` — decrements the giver's `givingBalance` by `amount × N`, increments each recipient's `earnedBalance` by exactly `amount`, and returns HTTP 201 with the list of created recognitions

### Requirement: Reject self-recognition

The system SHALL reject any recognition whose recipient list contains the giver.

#### Scenario: Giver appears alone in the recipient list

- **WHEN** an authenticated user POSTs a recognition whose recipient list contains only their own id
- **THEN** the system responds with HTTP 400 and the message "cannot recognize yourself" and does NOT modify any balance or append any row

#### Scenario: Giver appears among multiple recipients

- **WHEN** an authenticated user POSTs a recognition whose recipient list contains their own id alongside other ids
- **THEN** the system responds with HTTP 400 with the message "cannot recognize yourself" and does NOT modify any balance or append any row (the entire request is rejected, not partially fulfilled for the other recipients)

### Requirement: Reject duplicate recipients

The system SHALL reject any recognition whose recipient list contains the same recipient id more than once, so that a giver cannot accidentally (or intentionally) double-charge themselves to award one teammate twice in a single action.

#### Scenario: Duplicate ids in recipient list

- **WHEN** an authenticated user POSTs a recognition whose recipient list contains the same id more than once
- **THEN** the system responds with HTTP 400 with the message "duplicate recipients are not allowed" and does NOT modify any balance or append any row

### Requirement: Reject recognition exceeding remaining allowance

The system SHALL reject any recognition whose total cost (`amount × number of recipients`) is greater than the giver's current `givingBalance` (after the lazy monthly refresh has been applied).

#### Scenario: Total cost exceeds remaining giving balance

- **WHEN** an authenticated user with `givingBalance = 20` POSTs a recognition with `amount = 10` and three recipients (total cost = 30)
- **THEN** the system responds with HTTP 400 with the message "insufficient giving balance" and does NOT modify any balance or append any row

#### Scenario: Amount is zero or negative

- **WHEN** an authenticated user POSTs a recognition with amount 0 or a negative amount
- **THEN** the system responds with HTTP 400 with the message "amount must be a positive integer"

### Requirement: Validate recipients and content

The system SHALL reject recognitions whose recipient list is empty, whose recipient list contains any id that does not exist, whose message is empty, or whose hashtags include any value not in the configured list. When at least one recipient id is missing, the entire request MUST be rejected; the system MUST NOT silently drop the missing id and process the valid recipients.

#### Scenario: Empty recipient list

- **WHEN** the recipient list is empty (or the field is missing)
- **THEN** the system responds with HTTP 400 with the message "at least one recipient is required"

#### Scenario: One recipient does not exist

- **WHEN** the recipient list contains one or more ids that do not match any row in the `users` sheet
- **THEN** the system responds with HTTP 404 with a message that identifies the missing recipient id(s), and does NOT modify any balance or append any row

#### Scenario: Empty message

- **WHEN** the message is an empty string or whitespace-only
- **THEN** the system responds with HTTP 400 with the message "message is required"

#### Scenario: Disallowed hashtag

- **WHEN** the hashtag list contains a value that is not in the configured allowed set
- **THEN** the system responds with HTTP 400 with a message identifying the disallowed hashtag

#### Scenario: No hashtags provided

- **WHEN** the hashtag list is empty
- **THEN** the system responds with HTTP 400 with the message "at least one hashtag is required"

### Requirement: Recognition write is all-or-nothing

The system SHALL execute the entire give operation — validation, recognition row INSERTs, recipient balance UPDATEs, and the giver balance UPDATE — inside a single database transaction. If any step throws, the transaction MUST roll back so that no row is inserted and no balance is modified. The transaction MUST detect concurrent writes to the giver's row using optimistic locking (a `@Version` column) and reject the slower transaction with HTTP 409 `"conflicting concurrent update — please retry"` rather than silently overwriting the other transaction's debit.

#### Scenario: Validation precedes any write

- **WHEN** a recognition request fails any validation rule
- **THEN** no rows in `users` or `recognitions` are modified (the transaction never reaches the first INSERT)

#### Scenario: Mid-transaction failure rolls back cleanly

- **WHEN** the database raises an exception part-way through the give sequence (e.g., a foreign-key violation, a check-constraint failure, or a connection drop)
- **THEN** the transaction rolls back leaving no recognition rows and no balance changes; the system logs an ERROR with the giver id, the full recipient id list, the per-recipient amount, and the failure cause; and the response is HTTP 500 with a generic message

#### Scenario: Concurrent givers race on the same balance

- **WHEN** two transactions both load the same giver's row with `givingBalance = 30` and both attempt to debit 25 (so both would succeed independently)
- **THEN** the transaction that commits first succeeds; the other transaction sees an `OptimisticLockException` on commit and is rejected with HTTP 409 `"conflicting concurrent update — please retry"`; neither transaction overwrites the other's debit silently

#### Scenario: Multi-recipient sequence is one transaction

- **WHEN** an authenticated user POSTs a multi-recipient recognition
- **THEN** the entire validation-INSERT-credit-debit sequence executes inside a single `@Transactional` boundary, so other transactions never observe a half-applied state
