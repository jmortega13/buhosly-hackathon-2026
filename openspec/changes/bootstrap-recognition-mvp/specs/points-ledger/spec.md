## ADDED Requirements

### Requirement: Monthly giving allowance refresh

Each user SHALL have a giving balance that resets to a configurable default amount (default at launch: **30 points**) at the start of each calendar month. "Calendar month" SHALL be evaluated in the **Asia/Manila** time zone, regardless of the JVM's default zone. Unused allowance MUST NOT roll over into the next month. Refresh SHALL be applied lazily — the first time the user takes any action in a new month, their giving balance is reset before that action is evaluated.

#### Scenario: First action in a new month

- **WHEN** a user attempts to give recognition or fetches their profile, and their stored `givingMonth` is earlier than the current month in Asia/Manila
- **THEN** the system sets their `givingBalance` to the configured default and `givingMonth` to the current month (Asia/Manila) before evaluating the action

#### Scenario: Same-month action does not refresh

- **WHEN** a user takes any action and their stored `givingMonth` already matches the current month in Asia/Manila
- **THEN** the system does NOT modify `givingBalance` or `givingMonth` as part of the refresh logic

#### Scenario: Unused allowance does not roll over

- **WHEN** a user ends a month with a non-zero giving balance and the next month begins (in Asia/Manila)
- **THEN** on the user's next action the giving balance is reset to the default — the prior month's unused amount is lost

#### Scenario: Month boundary is interpreted in Asia/Manila, not UTC

- **WHEN** the current UTC time is 23:00 on the 31st (so 07:00 on the 1st in Asia/Manila) and a user's stored `givingMonth` matches the prior month
- **THEN** the system treats this as a new month and refreshes the user's balance (Asia/Manila is the source of truth)

### Requirement: Earned balance accumulation

Each user SHALL have an earned balance that increases when other users give them recognition points and decreases when the user redeems rewards. Earned balance MUST NOT expire and MUST NOT be reset by the monthly refresh.

#### Scenario: Receiving recognition

- **WHEN** user A gives user B `N` points of recognition successfully
- **THEN** user B's `earnedBalance` increases by exactly `N`

#### Scenario: Redeeming a reward

- **WHEN** a user redeems a reward costing `C` points
- **THEN** the user's `earnedBalance` decreases by exactly `C`

#### Scenario: Earned balance survives month rollover

- **WHEN** a calendar month ends and a new month begins
- **THEN** the user's `earnedBalance` is unchanged

### Requirement: Separation of giving and earned balances

The giving balance and earned balance SHALL be independent and non-fungible. A user MUST NOT be able to spend earned balance when giving recognition, and MUST NOT be able to redeem rewards using giving balance.

#### Scenario: Giving deducts only from giving balance

- **WHEN** a user with `givingBalance = 50` and `earnedBalance = 200` gives 30 points of recognition
- **THEN** `givingBalance` becomes 20 and `earnedBalance` stays at 200

#### Scenario: Redeeming deducts only from earned balance

- **WHEN** a user with `givingBalance = 50` and `earnedBalance = 200` redeems a 75-point reward
- **THEN** `earnedBalance` becomes 125 and `givingBalance` stays at 50

#### Scenario: Cannot redeem from giving balance

- **WHEN** a user with `givingBalance = 500` and `earnedBalance = 10` attempts to redeem a 50-point reward
- **THEN** the system rejects the redemption with HTTP 400 and the message "insufficient earned balance"
