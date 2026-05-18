## ADDED Requirements

### Requirement: Server-proxied GIF search

The system SHALL expose `GET /api/v1/gifs?q=<query>` that returns a list of GIF results sourced from the Giphy v1 search API. The backend MUST hold the Giphy API key in a server-side environment variable (`GIPHY_API_KEY`); the key MUST NOT be sent to the browser. The endpoint MUST require an authenticated session like every other read endpoint.

#### Scenario: Search returns results

- **WHEN** an authenticated user calls `GET /api/v1/gifs?q=celebrate`
- **THEN** the system responds with HTTP 200 and a JSON array of items shaped `{id: string, previewUrl: string, gifUrl: string, alt: string}`, where `previewUrl` is the smaller `fixed_width` rendition (~200 px wide) and `gifUrl` is the `original` rendition suitable for attachment

#### Scenario: Empty or missing query

- **WHEN** an authenticated user calls `GET /api/v1/gifs` with no `q` parameter (or `q=""`)
- **THEN** the system responds with HTTP 400 with the message "q is required"

#### Scenario: Unauthenticated request

- **WHEN** the request omits a valid `Authorization: Bearer …` header
- **THEN** the system responds with HTTP 401

#### Scenario: Giphy is unreachable

- **WHEN** the backend cannot reach Giphy (timeout, 5xx, network error)
- **THEN** the system responds with HTTP 503 and the message "gif search temporarily unavailable"; the failure is logged for diagnostics

#### Scenario: GIPHY_API_KEY is missing

- **WHEN** the server starts without `GIPHY_API_KEY` set and a client calls `/api/v1/gifs?q=…`
- **THEN** the system responds with HTTP 503 with the message "gif search is not configured on the server"

### Requirement: Response shape never leaks the Giphy key

The endpoint MUST shape Giphy's response down to the fields the frontend actually uses (`id`, `previewUrl`, `gifUrl`, `alt`) and MUST NOT pass through any Giphy-internal field that contains or could be used to derive the API key.

#### Scenario: Response excludes credentials

- **WHEN** the endpoint returns results
- **THEN** the JSON body contains no field named `key`, `api_key`, or any URL that includes the Giphy API key as a query parameter

### Requirement: Result limit and content filter

The endpoint SHALL cap results at 20 per call and SHALL request Giphy with `rating=pg` so the frontend gets exactly the rendition set it needs and adult content is filtered server-side.

#### Scenario: Cap at 20

- **WHEN** an authenticated user calls `GET /api/v1/gifs?q=anything`
- **THEN** the response array contains at most 20 items
