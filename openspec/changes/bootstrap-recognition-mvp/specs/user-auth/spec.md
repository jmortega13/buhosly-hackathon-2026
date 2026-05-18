## ADDED Requirements

### Requirement: Sign in with Google only

The system SHALL authenticate users **exclusively via Google Sign-In** (Google Identity Services). There is no email-and-password form, no self-signup form, no admin pre-seed of credentials, and no user-entered field of any kind beyond Google's account-chooser. Sign-in completes by the client posting a Google-issued ID token to the server, which verifies the token and exchanges it for an application JWT.

#### Scenario: Valid Google ID token returns an app JWT

- **WHEN** a client POSTs a Google-issued ID token whose signature verifies against Google's published JWKS, whose `aud` matches the configured Google OAuth client id, whose `exp` is in the future, and whose email domain is on the allowed list
- **THEN** the system responds with HTTP 200, an application-issued JWT bearer token, and the user's profile (`id`, `email`, `name`)

#### Scenario: Invalid Google ID token

- **WHEN** the posted token fails any of: signature verification, audience match, expiration, or required-claim presence (`email`, `email_verified=true`, `name`)
- **THEN** the system responds with HTTP 401 with a generic "invalid sign-in" message and does NOT create a user row or issue a JWT

#### Scenario: No password endpoints exist

- **WHEN** a client calls any endpoint that would imply password-based auth (e.g., `POST /api/v1/auth/login` with `{email, password}`)
- **THEN** the system responds with HTTP 404 — password authentication is not implemented

### Requirement: Domain allowlist

The system SHALL only authenticate users whose verified Google email domain appears in the configured allowlist. For the Synacy hackathon launch the allowlist is `synacy.com` and `rise.com`. The list is configured in `application.yml` under `app.auth.allowed-domains` and is admin-editable without code changes.

#### Scenario: Allowed domain — synacy.com

- **WHEN** the verified Google ID token's email ends with `@synacy.com`
- **THEN** authentication proceeds to user lookup / JIT provisioning

#### Scenario: Allowed domain — rise.com

- **WHEN** the verified Google ID token's email ends with `@rise.com`
- **THEN** authentication proceeds to user lookup / JIT provisioning

#### Scenario: Disallowed domain

- **WHEN** the verified Google ID token's email ends with any domain not in the configured allowlist (e.g., `@gmail.com`, `@example.com`)
- **THEN** the system responds with HTTP 403 with the message "domain not allowed" and does NOT create a user row or issue a JWT

### Requirement: Just-in-time user provisioning

On a successful sign-in where the verified email does not match any existing row in the `users` sheet, the system SHALL create a new user row before issuing the JWT. The new row MUST use a server-generated UUID, the `email` and `name` claims from the verified Google ID token, `givingBalance = app.allowance.default-points` (30), `givingMonth = currentMonth("Asia/Manila")`, `earnedBalance = 0`, and `createdAt = now (UTC)`. Email matching MUST be case-insensitive.

#### Scenario: First-time sign-in creates a user row

- **WHEN** an authorized user signs in and their email does not exist in the `users` sheet
- **THEN** the system appends a new row to `users` with the fields above and then issues the JWT for that row's id

#### Scenario: Returning user sign-in reuses existing row

- **WHEN** an authorized user signs in and their email already exists in the `users` sheet (case-insensitively)
- **THEN** the system locates the existing row and issues a JWT for its id; no new row is created and no existing field on the row (name, balances, createdAt) is altered as part of sign-in

### Requirement: Authenticated session via bearer token

All endpoints except the Google sign-in endpoint SHALL require a valid application JWT in the `Authorization: Bearer <token>` header. Requests without a token, with an expired token, or with an invalid signature MUST be rejected with HTTP 401.

#### Scenario: Missing token on a protected endpoint

- **WHEN** a client calls a protected endpoint without an `Authorization` header
- **THEN** the system responds with HTTP 401

#### Scenario: Expired token

- **WHEN** a client calls a protected endpoint with a JWT whose expiration is in the past
- **THEN** the system responds with HTTP 401 and the client is expected to redirect the user to the sign-in page

#### Scenario: Tampered token

- **WHEN** a client calls a protected endpoint with a JWT whose signature does not verify against the server secret
- **THEN** the system responds with HTTP 401

### Requirement: Authenticated user can fetch their own profile

The system SHALL expose an endpoint that returns the currently authenticated user's profile, including id, email, name, current giving balance, current month for that balance, and earned balance. The endpoint MUST NOT return any internal-only fields.

#### Scenario: Profile fetch

- **WHEN** an authenticated user calls the profile endpoint
- **THEN** the system responds with their id, email, name, giving balance, giving month, and earned balance

#### Scenario: Lazy allowance refresh on profile fetch

- **WHEN** an authenticated user calls the profile endpoint and their stored `givingMonth` is earlier than the current Asia/Manila month
- **THEN** the system updates that user's `givingBalance` to the configured default and `givingMonth` to the current month, then returns the refreshed values
