# buhosly backend

Spring Boot 3.5 service backing the buhosly peer-recognition app. Persists everything to **PostgreSQL 16** via Spring Data JPA. Schema is owned by Flyway; local Postgres comes from the repo-root `docker-compose.yml`.

## Run

```bash
# 1. Start Postgres (from the repo root)
docker compose up -d

# 2. Set required env vars (the datasource defaults match the compose file)
export JWT_SECRET=$(openssl rand -base64 48)   # ≥ 32 chars
export GOOGLE_CLIENT_ID=<your-oauth-web-client-id>.apps.googleusercontent.com

# 3. Start the API (applies Flyway migrations on first run)
./mvnw spring-boot:run
```

`GOOGLE_CLIENT_ID` comes from a Google Cloud project: APIs & Services → Credentials → Create OAuth 2.0 Client ID → Web application, with `http://localhost:4200` listed as an authorised JavaScript origin. The same client id goes into `src/environments/environment.ts` for the Angular app.

Optional overrides (defaults shown):

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/buhosly
export SPRING_DATASOURCE_USERNAME=buhosly
export SPRING_DATASOURCE_PASSWORD=buhosly
```

## Database schema

Owned by Flyway migrations under `src/main/resources/db/migration/`. **Never edit an applied migration** — add a new `V<n+1>__<name>.sql` instead. Hibernate's `ddl-auto: validate` will fail to start the app if the entity model and the schema diverge.

### `users`

> Created **just-in-time** on first Google sign-in. **No password column** — auth is Google-only.

| Column           | Type           | Notes                                                       |
| ---------------- | -------------- | ----------------------------------------------------------- |
| `id`             | UUID PK        | Application-generated UUID                                  |
| `email`          | VARCHAR UNIQUE | From the verified Google ID token                           |
| `name`           | VARCHAR        | From the verified Google ID token                           |
| `giving_balance` | INTEGER        | Current month's remaining give-budget                       |
| `giving_month`   | VARCHAR(7)     | `YYYY-MM`, **Asia/Manila** local time                       |
| `earned_balance` | INTEGER        | Lifetime balance available for redeeming                    |
| `created_at`     | TIMESTAMPTZ    | UTC                                                         |
| `row_version`    | INTEGER        | JPA `@Version` for optimistic locking (HTTP 409 on conflict) |

### `recognitions`

One row per `(giver, recipient)` pair. A multi-recipient give writes N rows sharing `created_at`, `message`, and `hashtags`.

| Column         | Type        | Notes                                                |
| -------------- | ----------- | ---------------------------------------------------- |
| `id`           | UUID PK     |                                                      |
| `giver_id`     | UUID FK     | → `users.id`                                         |
| `recipient_id` | UUID FK     | → `users.id`                                         |
| `amount`       | INTEGER     | `CHECK (amount > 0)`                                 |
| `message`      | TEXT        |                                                      |
| `hashtags`     | VARCHAR     | comma-separated, mapped via `StringListConverter`    |
| `created_at`   | TIMESTAMPTZ | indexed `DESC` for the feed                          |

### `rewards`

| Column        | Type        | Notes                                       |
| ------------- | ----------- | ------------------------------------------- |
| `id`          | UUID PK     |                                             |
| `name`        | VARCHAR     |                                             |
| `description` | TEXT        |                                             |
| `cost_points` | INTEGER     | `CHECK (cost_points > 0)`                   |
| `image_url`   | VARCHAR     | nullable                                    |
| `active`      | BOOLEAN     | inactive rewards are hidden from the API    |

`V2__seed_rewards.sql` ships 4 demo rewards so a fresh DB is demo-ready.

### `redemptions`

| Column        | Type        | Notes                                              |
| ------------- | ----------- | -------------------------------------------------- |
| `id`          | UUID PK     |                                                    |
| `user_id`     | UUID FK     | → `users.id`                                       |
| `reward_id`   | UUID FK     | → `rewards.id`                                     |
| `cost_points` | INTEGER     | snapshot at redemption time                        |
| `created_at`  | TIMESTAMPTZ |                                                    |
| `status`      | VARCHAR(20) | `pending` (default) / `fulfilled` / `cancelled`    |

## REST API summary

| Method | Path                          | Auth | Notes                                                                          |
| ------ | ----------------------------- | ---- | ------------------------------------------------------------------------------ |
| POST   | `/api/v1/auth/google`         | —    | `{idToken}` (Google ID token) → `{token, user}` (app JWT). JIT-creates user.   |
| GET    | `/api/v1/me`                  | JWT  | profile incl. balances; applies lazy monthly refresh                           |
| GET    | `/api/v1/users`               | JWT  | minimal list (excludes self) for the recipient picker                          |
| POST   | `/api/v1/recognitions`        | JWT  | `{recipientIds[], amount, message, hashtags[]}` → array of items               |
| GET    | `/api/v1/feed?page=&size=`    | JWT  | reverse-chronological feed                                                     |
| GET    | `/api/v1/rewards`             | JWT  | active rewards only                                                            |
| POST   | `/api/v1/redemptions`         | JWT  | `{rewardId}` → redemption (pending)                                            |
| GET    | `/api/v1/redemptions/me`      | JWT  | caller's redemption history                                                    |

## Resetting the demo

```bash
docker compose down -v   # drops the named pgdata volume
docker compose up -d
./mvnw spring-boot:run   # re-applies V1__init.sql + V2__seed_rewards.sql
```
