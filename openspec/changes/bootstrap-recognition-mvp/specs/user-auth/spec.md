## ADDED Requirements

### Requirement: Pre-seeded user identities

The system SHALL maintain a user record for every Synacy employee who is to use the app. User records SHALL be created administratively (no self-service signup in MVP). Each user record MUST include a unique id, email, display name, BCrypt-hashed password, monthly giving balance, the month that giving balance applies to, earned balance, and a creation timestamp.

#### Scenario: New user is seeded

- **WHEN** an administrator adds a row to the `users` sheet with email, name, and password hash
- **THEN** the user can authenticate with their email and the corresponding plaintext password on the next login attempt

#### Scenario: Self-signup is rejected

- **WHEN** an unauthenticated client calls any signup-style endpoint
- **THEN** the system SHALL respond with HTTP 404 (no such endpoint exists in MVP)

### Requirement: Email and password login

The system SHALL authenticate users with email and password. On success the system MUST return a signed JWT containing the user id and an expiration claim. On failure the system MUST return HTTP 401 with a generic "invalid credentials" message that does NOT reveal whether the email exists.

#### Scenario: Valid credentials

- **WHEN** a client POSTs valid email and password to the login endpoint
- **THEN** the system responds with HTTP 200, a JWT bearer token, and the authenticated user's profile (id, email, name)

#### Scenario: Wrong password

- **WHEN** a client POSTs a known email with the wrong password
- **THEN** the system responds with HTTP 401 and a generic error message

#### Scenario: Unknown email

- **WHEN** a client POSTs an email that does not exist in the `users` sheet
- **THEN** the system responds with HTTP 401 and the same generic error message used for a wrong password (no user-enumeration leak)

### Requirement: Authenticated session via bearer token

All endpoints except login SHALL require a valid JWT in the `Authorization: Bearer <token>` header. Requests without a token, with an expired token, or with an invalid signature MUST be rejected with HTTP 401.

#### Scenario: Missing token on a protected endpoint

- **WHEN** a client calls a protected endpoint without an `Authorization` header
- **THEN** the system responds with HTTP 401

#### Scenario: Expired token

- **WHEN** a client calls a protected endpoint with a JWT whose expiration is in the past
- **THEN** the system responds with HTTP 401 and the client is expected to redirect the user to the login page

#### Scenario: Tampered token

- **WHEN** a client calls a protected endpoint with a JWT whose signature does not verify against the server secret
- **THEN** the system responds with HTTP 401

### Requirement: Authenticated user can fetch their own profile

The system SHALL expose an endpoint that returns the currently authenticated user's profile, including id, email, name, current giving balance, current month for that balance, and earned balance. The endpoint MUST NOT return the password hash.

#### Scenario: Profile fetch

- **WHEN** an authenticated user calls the profile endpoint
- **THEN** the system responds with their id, email, name, giving balance, giving month, and earned balance, and no password hash

#### Scenario: Lazy allowance refresh on profile fetch

- **WHEN** an authenticated user calls the profile endpoint and their stored `givingMonth` is earlier than the current month
- **THEN** the system updates that user's `givingBalance` to the configured default and `givingMonth` to the current month, then returns the refreshed values
