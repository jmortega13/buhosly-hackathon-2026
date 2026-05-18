## Why

Synacy needs an internal peer-recognition tool so teammates can publicly appreciate each other's work and convert that recognition into tangible rewards. We are modeling the experience on Bonusly because the mechanic of a refreshing monthly point allowance — points you must give away or lose — has been validated to drive ongoing recognition rather than one-off shout-outs. This proposal bootstraps the MVP for a hackathon timeline: enough to demo the core loop (give → feed → earn → redeem) end-to-end, without integrations or admin tooling.

## What Changes

- Add user authentication so each Synacy employee has an identity, a giving balance, and an earned balance.
- Add a monthly **giving allowance** that refreshes on the 1st of each month; unused allowance expires (it does not roll over).
- Add the ability to **give recognition**: pick **one or more recipients**, attach a per-recipient amount, a free-text message, and at least one `#hashtag` mapped to a company value. Each recipient receives the full `amount`; the giver's allowance is debited by `amount × number of recipients`, which must fit within the giver's remaining monthly allowance.
- Add a chronological **public recognition feed** showing every recognition with giver, recipient, amount, message, and hashtags.
- Add an **earned balance** that accumulates points received and is separate from the giving allowance (earned points do not expire).
- Add a **rewards catalog** with a fixed set of redeemable items and a redemption action that deducts from the earned balance.
- Persist all of the above through a Spring Boot API backed by **Google Sheets** as the data store (one tab per entity: users, recognitions, rewards, redemptions). No relational DB.

Out of scope for this proposal: Slack/Teams integrations, add-on/pile-on points, comments, admin analytics, HRIS sync, email notifications, password reset flows, and audit/export tooling.

## Capabilities

### New Capabilities

- `user-auth`: Identity and session management for Synacy employees, including the per-user giving allowance and earned balance fields.
- `points-ledger`: Rules for the monthly giving allowance (refresh, expiry) and the earned balance (accumulation, deduction on redemption). Source of truth for "can this user afford this action?" checks.
- `give-recognition`: The action of one user awarding points to another, including validation of recipient, amount, message, and at least one hashtag.
- `recognition-feed`: Read-only, reverse-chronological public listing of all recognitions across the organization.
- `rewards-catalog`: Listing of available rewards and the redemption flow that debits the earned balance and records a redemption.

### Modified Capabilities

<!-- None — this is the initial bootstrap; no prior specs exist. -->

## Impact

- **New code (frontend)**: Angular routes/components for login, feed, give-recognition form, profile (showing both balances), rewards catalog, and redemption history. Auth interceptor + auth guard. Shared HTTP service layer pointing at the Spring Boot API.
- **New code (backend)**: Spring Boot service with REST endpoints for auth, users, recognitions, rewards, and redemptions. Google Sheets API client wrapping a service-account credential. Domain services that enforce allowance/balance rules.
- **External dependencies**: `google-api-services-sheets` (Java client), a Google service account with edit access to the spreadsheet, and the Sheets spreadsheet itself (created out-of-band with the expected tab layout).
- **Data store**: A single Google Spreadsheet with tabs `users`, `recognitions`, `rewards`, `redemptions`. Schema details deferred to design.md.
- **Operational risks**: Google Sheets has per-minute API quotas and no transactions — concurrent "give" actions could race on balance updates. Mitigation strategy deferred to design.md.
- **Affected systems**: None pre-existing; this is greenfield. Future work will need to revisit auth (likely move to Synacy SSO) and persistence (likely move to a real DB) once the MVP is validated.
