## ADDED Requirements

### Requirement: Create a recognition

The system SHALL allow an authenticated user (the giver) to create a recognition that awards points to another user (the recipient). The request MUST include a recipient identifier, a positive integer amount, a non-empty message, and at least one hashtag drawn from the configured list of company values.

#### Scenario: Valid recognition succeeds

- **WHEN** an authenticated user POSTs a valid recognition (recipient exists, amount ≤ remaining giving balance, message non-empty, at least one allowed hashtag)
- **THEN** the system creates a new row in the `recognitions` sheet with a server-generated UUID, decrements the giver's `givingBalance` by the amount, increments the recipient's `earnedBalance` by the amount, and returns HTTP 201 with the new recognition

### Requirement: Reject self-recognition

The system SHALL reject any recognition whose giver and recipient are the same user.

#### Scenario: User tries to give recognition to themselves

- **WHEN** an authenticated user POSTs a recognition where the recipient id equals their own id
- **THEN** the system responds with HTTP 400 and the message "cannot recognize yourself" and does NOT modify any balance or append any row

### Requirement: Reject recognition exceeding remaining allowance

The system SHALL reject any recognition whose amount is greater than the giver's current `givingBalance` (after the lazy monthly refresh has been applied).

#### Scenario: Amount exceeds remaining giving balance

- **WHEN** an authenticated user with `givingBalance = 20` POSTs a recognition with amount 50
- **THEN** the system responds with HTTP 400 with the message "insufficient giving balance" and does NOT modify any balance or append any row

#### Scenario: Amount is zero or negative

- **WHEN** an authenticated user POSTs a recognition with amount 0 or a negative amount
- **THEN** the system responds with HTTP 400 with the message "amount must be a positive integer"

### Requirement: Validate recipient and content

The system SHALL reject recognitions whose recipient does not exist, whose message is empty, or whose hashtags include any value not in the configured list.

#### Scenario: Recipient does not exist

- **WHEN** the recipient id does not match any row in the `users` sheet
- **THEN** the system responds with HTTP 404 with the message "recipient not found"

#### Scenario: Empty message

- **WHEN** the message is an empty string or whitespace-only
- **THEN** the system responds with HTTP 400 with the message "message is required"

#### Scenario: Disallowed hashtag

- **WHEN** the hashtag list contains a value that is not in the configured allowed set
- **THEN** the system responds with HTTP 400 with the message identifying the disallowed hashtag

#### Scenario: No hashtags provided

- **WHEN** the hashtag list is empty
- **THEN** the system responds with HTTP 400 with the message "at least one hashtag is required"

### Requirement: Recognition write is all-or-nothing

Because Google Sheets has no transactions, the system SHALL serialize recognition writes through a single-threaded executor and SHALL ensure that any validation failure occurs BEFORE the first sheet write. If any sheet write fails mid-sequence, the system MUST log the partial state for manual reconciliation rather than silently swallowing the error.

#### Scenario: Validation precedes any write

- **WHEN** a recognition request fails any validation rule
- **THEN** no rows in `users` or `recognitions` are modified

#### Scenario: Partial write failure is logged

- **WHEN** the recognition row is appended successfully but the subsequent balance update fails (e.g., Sheets API outage)
- **THEN** the system logs an ERROR with the recognition id, giver id, recipient id, amount, and the failure cause, so an operator can manually reconcile the affected rows
