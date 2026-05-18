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

Because Google Sheets has no transactions, the system SHALL serialize recognition writes through a single-threaded executor and SHALL ensure that ALL validation occurs BEFORE the first sheet write. For a multi-recipient recognition the system MUST either successfully append all `N` recognition rows AND debit the giver once AND credit every recipient, or fail without having modified any balance or appended any row. If any sheet write fails mid-sequence, the system MUST log the partial state for manual reconciliation rather than silently swallowing the error.

#### Scenario: Validation precedes any write

- **WHEN** a recognition request fails any validation rule
- **THEN** no rows in `users` or `recognitions` are modified

#### Scenario: Partial write failure is logged

- **WHEN** some recognition rows are appended successfully but a subsequent balance update fails (e.g., Sheets API outage mid-sequence)
- **THEN** the system logs an ERROR including the giver id, the full recipient id list, the per-recipient amount, every recognition id that was appended, and the failure cause, so an operator can manually reconcile the affected rows

#### Scenario: Multi-recipient sequence is processed in a single executor task

- **WHEN** an authenticated user POSTs a multi-recipient recognition
- **THEN** the system processes the entire validation-append-credit-debit sequence inside a single task on the write executor, so concurrent giver actions cannot observe a half-applied state
