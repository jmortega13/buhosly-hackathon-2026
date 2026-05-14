## ADDED Requirements

### Requirement: List active rewards

The system SHALL expose an endpoint that returns the list of currently active rewards. A reward MUST include id, name, description, cost in points, and an optional image URL. Inactive rewards (rows with `active = false`) MUST NOT appear in the listing.

#### Scenario: Authenticated user views the catalog

- **WHEN** an authenticated user requests the rewards catalog
- **THEN** the system responds with the list of rewards where `active = true`, each item containing `id`, `name`, `description`, `costPoints`, and `imageUrl`

#### Scenario: Inactive rewards are hidden

- **WHEN** a reward row has `active = false`
- **THEN** that reward does NOT appear in the catalog response

### Requirement: Redeem a reward

The system SHALL allow an authenticated user to redeem an active reward if their `earnedBalance` is greater than or equal to the reward's `costPoints`. A successful redemption MUST decrement the user's `earnedBalance` by the reward's cost, append a new row to the `redemptions` sheet with `status = "pending"`, and return the new redemption.

#### Scenario: Successful redemption

- **WHEN** an authenticated user with sufficient `earnedBalance` POSTs a redemption for an active reward
- **THEN** the system decrements `earnedBalance` by `costPoints`, appends a redemption row with a new UUID, the user id, the reward id, a snapshot of `costPoints`, the current timestamp, and `status = "pending"`, and responds with HTTP 201 and the new redemption

#### Scenario: Insufficient earned balance

- **WHEN** an authenticated user with `earnedBalance < costPoints` POSTs a redemption
- **THEN** the system responds with HTTP 400 with the message "insufficient earned balance" and does NOT modify any balance or append any row

#### Scenario: Reward is inactive or missing

- **WHEN** the requested reward id has `active = false` or does not exist in the `rewards` sheet
- **THEN** the system responds with HTTP 404 with the message "reward not available"

### Requirement: Cost snapshot at redemption time

The `redemptions` sheet SHALL store the `costPoints` value as it was at the moment of redemption. Subsequent changes to the reward's price MUST NOT alter past redemption rows.

#### Scenario: Reward price changes after redemption

- **WHEN** a user redeems a reward at `costPoints = 100`, and an administrator later edits the reward to `costPoints = 150`
- **THEN** the original redemption row still shows `costPoints = 100`

### Requirement: View own redemption history

The system SHALL expose an endpoint returning the authenticated user's redemption history. The response MUST include each redemption's id, reward id, reward name (snapshot or current — implementer's choice, documented), `costPoints`, `createdAt`, and `status`. Users MUST NOT see other users' redemption history.

#### Scenario: Authenticated user views their history

- **WHEN** an authenticated user requests their redemption history
- **THEN** the system responds with the list of redemptions whose `userId` matches the requester, in reverse-chronological order

#### Scenario: Another user's history is not exposed

- **WHEN** an authenticated user attempts to fetch redemptions filtered by a different user's id
- **THEN** the system responds with HTTP 403 (or silently returns only the requester's redemptions, depending on endpoint shape — but never exposes another user's data)
