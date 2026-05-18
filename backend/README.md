# buhosly backend

Spring Boot 3.5 service backing the buhosly peer-recognition app. Persists everything to **PostgreSQL 16** via Spring Data JPA. Schema is owned by Flyway; local Postgres comes from the repo-root `docker-compose.yml`.

## Prerequisites

Check these once before your first run:

```bash
docker --version           # any recent version (Docker Desktop, Colima, etc.)
docker compose version     # plugin form — `docker-compose` legacy is fine too
java -version              # 21.x (LTS). The Gradle toolchain will fetch JDK 21 if missing.
node --version             # 22.x or 24.x (LTS) recommended for the frontend
ng version                 # Angular CLI 21.x for the frontend
```

You need **one required** + **one optional** external API key (both one-time):

### Google OAuth 2.0 Web client id (required for sign-in)

1. Go to https://console.cloud.google.com/ and pick or create a project.
2. **APIs & Services → OAuth consent screen** → configure it (Internal if the project sits in a Google Workspace; otherwise External + Testing). Default scopes `email`, `profile`, `openid` are enough.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
4. Under **Authorized JavaScript origins**, add `http://localhost:4200`.
5. Copy the generated **Client ID** (it ends in `.apps.googleusercontent.com`). You'll paste this into both `backend/.env` (`GOOGLE_CLIENT_ID=…`) and `src/environments/environment.ts` (`googleClientId: …`).

### Giphy API key (optional — required only for the GIF picker)

1. Visit https://developers.giphy.com and sign in (Google or email).
2. Click **Create an App** → pick the **API** SDK option (not SDK), name it `buhosly` → submit.
3. The dashboard now lists your key under **API Key** (`A1bC…`).
4. Paste it into `backend/.env` (`GIPHY_API_KEY=…`).

If `GIPHY_API_KEY` is empty, the emoji picker still works; the GIF panel returns HTTP 503 "gif search is not configured on the server" and shows that message in the UI.

### Admin email allowlist (optional — gates the admin dashboard)

Users whose verified Google email appears in `ADMIN_EMAILS` (comma-separated, no spaces) gain access to `/admin/*` routes in the SPA and every `/api/v1/admin/**` endpoint on the backend. Add or remove entries by editing `backend/.env` and restarting the backend; **users already signed in will need to sign out and back in** so their new JWT carries the admin claim.

```
ADMIN_EMAILS=manuel.ortega@synacy.com,another.admin@synacy.com
```

If `ADMIN_EMAILS` is empty, there are no admins and every admin endpoint returns HTTP 403.

No Postgres install is required on the host — it runs in Docker via the repo-root `docker-compose.yml`.

## Run

```bash
# 1. Start Postgres (from the repo root)
docker compose up -d

# 2. Configure secrets — first run only
cp backend/.env.example backend/.env
# Edit backend/.env:
#   - JWT_SECRET: generate with `openssl rand -base64 48`
#   - GOOGLE_CLIENT_ID: your Google OAuth Web client id
# (.env is gitignored.)

# 3. Start the API (applies Flyway migrations on first run)
cd backend
./gradlew bootRun
```

The backend uses [spring-dotenv](https://github.com/paulschwarz/spring-dotenv), so `backend/.env` is read automatically when you run `./gradlew bootRun` from `backend/` — no `export` needed.

`GOOGLE_CLIENT_ID` comes from a Google Cloud project: APIs & Services → Credentials → Create OAuth 2.0 Client ID → Web application, with `http://localhost:4200` listed as an authorised JavaScript origin. The same client id goes into `src/environments/environment.ts` for the Angular app.

Optional overrides (defaults match the compose Postgres):

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/buhosly
SPRING_DATASOURCE_USERNAME=buhosly
SPRING_DATASOURCE_PASSWORD=buhosly
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

## Demo data

A clean `docker compose up -d` followed by `./gradlew bootRun` applies five Flyway migrations and gives you:

| Migration | What it seeds |
| --- | --- |
| `V1__init.sql` | Schema (no data) |
| `V2__seed_rewards.sql` | 4 redeemable rewards (Coffee, Half-day off, Lunch voucher, Custom merch) |
| `V3__hashtags.sql` | 4 starter hashtags (`teamwork`, `ownership`, `impact`, `kindness`) at `usage_count = 0` |
| `V4__seed_test_users.sql` | 5 demo users at `@buhosly.demo` (Maria Cruz, Juan Reyes, Anna Garcia, Carlo Santos, Bea Mendoza) with varied balances |
| `V5__more_hashtags.sql` | 10 additional hashtag suggestions (`collaboration`, `mentorship`, `innovation`, `leadership`, `helpful`, `growth`, `customer-love`, `above-and-beyond`, `problem-solving`, `craftsmanship`) |
| `V6__add_gif_url.sql` | Adds nullable `gif_url VARCHAR(2048)` column to `recognitions` for the optional GIF attachment |
| `V7__set_reward_images.sql` | Backfills `image_url` on the four V2-seeded rewards using stable Unsplash CDN URLs |
| `V8__admin_overrides.sql` | Adds nullable `monthly_allowance INTEGER` column to `users` for the per-user persistent allowance override |

The demo users **cannot sign in** — their email domain `@buhosly.demo` isn't on the `app.auth.allowed-domains` list. They exist purely as `@`-mention targets so the dropdown isn't empty in a fresh database. When you're ready to ship to a real environment, delete `V4__seed_test_users.sql` (or use a separate Flyway location for dev seeds — out of scope for the hackathon).


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
| GET    | `/api/v1/hashtags?q=`         | JWT  | hashtag suggestions, ordered by usage_count desc                               |
| GET    | `/api/v1/gifs?q=`             | JWT  | Giphy-proxied GIF search; returns `[{id, previewUrl, gifUrl, alt}]`            |
| GET    | `/api/v1/admin/users`         | Admin| All users with balances + monthly allowance override                            |
| POST   | `/api/v1/admin/users/{id}/top-up` | Admin| `{amount}` — add to current-month giving balance                          |
| PUT    | `/api/v1/admin/users/{id}/monthly-allowance` | Admin | `{monthlyAllowance}` — set/clear persistent override          |
| GET    | `/api/v1/admin/rewards`       | Admin| All rewards (incl. inactive)                                                    |
| POST   | `/api/v1/admin/rewards`       | Admin| Create reward                                                                   |
| PUT    | `/api/v1/admin/rewards/{id}`  | Admin| Update reward                                                                   |
| DELETE | `/api/v1/admin/rewards/{id}`  | Admin| Soft-delete (active=false)                                                      |
| GET    | `/api/v1/admin/redemptions`   | Admin| All redemptions with joined user + reward names                                 |
| GET    | `/api/v1/admin/redemptions.csv` | Admin | Same data, RFC-4180 CSV download (import into Google Sheets)                |

## Inspecting Postgres locally

Open an interactive `psql` shell inside the running container:

```bash
docker exec -it buhosly-postgres psql -U buhosly -d buhosly
```

You'll land in a `buhosly=#` prompt. Useful commands once inside:

```
\dt                                       -- list tables
\d users                                  -- describe the users table
SELECT * FROM users;
SELECT email, giving_balance, earned_balance FROM users;
SELECT * FROM rewards WHERE active = true;
\q                                        -- quit
```

One-off queries without entering the shell:

```bash
docker exec -it buhosly-postgres psql -U buhosly -d buhosly -c '\dt'
docker exec -it buhosly-postgres psql -U buhosly -d buhosly -c 'SELECT email, giving_balance FROM users;'
```

If you have `psql` installed on the host (`sudo apt install postgresql-client` on Ubuntu, `brew install libpq` on macOS), you can skip Docker:

```bash
PGPASSWORD=buhosly psql -h localhost -U buhosly -d buhosly
```

Connection details (match `docker-compose.yml`): host `localhost`, port `5432`, db `buhosly`, user `buhosly`, password `buhosly`.

## Resetting the demo

```bash
docker compose down -v   # drops the named pgdata volume
docker compose up -d
./gradlew bootRun   # re-applies V1__init.sql + V2__seed_rewards.sql
```
