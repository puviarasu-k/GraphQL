# ZeroQueue — Security & Architecture Overhaul

## Critical bugs fixed

1. **Static OTP ("1111") for every login.** `AuthService.login()` hardcoded
   the OTP, so anyone who knew a mobile number could authenticate as that
   user. Replaced with a cryptographically random 4-digit OTP per request
   (`crypto.randomInt`), still stored only as a bcrypt hash.
2. **Fake, unsigned "token".** A successful OTP check returned the literal
   string `'asas'` as the auth token — forgeable by anyone, not a JWT at all.
   Replaced with real signed access + refresh JWTs (`@nestjs/jwt`), with
   rotation and server-side revocation via Redis.
3. **Wide-open Redis API.** `RedisController` let anyone, unauthenticated,
   read/write/delete *any* Redis key — including other users' OTP sessions,
   rate-limit counters, and lockout flags (full auth bypass). Now behind the
   global JWT guard + `ADMIN` role, and the security-critical key namespaces
   (`ratelimit:`, `lockout:`, `failed:`, `refresh:`) are blocked even for
   admins.
4. **OTP login never touched the `users` table.** There was no way to look
   up or create an actual account, and no user id to put in a token. Fixed
   with `UsersService.findOrCreateByMobile`, called on successful OTP
   verification, plus a unique index on `mobile` (race-safe).
5. **`UsersController` was never registered in `UsersModule`** — its route(s)
   never existed in the running app. Registered, and given a protected
   `GET /users/me` endpoint.
6. **Hardcoded DB credentials in source** (`root`/`root`, `localhost`) in
   `app.module.ts`, with no env-based configuration. Moved to validated env
   vars via `@nestjs/config`; `synchronize` now defaults to `false` and must
   be explicitly enabled for local dev only.
7. **`login()` didn't check the per-mobile lockout** before issuing a new
   OTP session — a locked-out attacker could just request a fresh `id` and
   keep guessing. Now checked in both `login()` and `verifyOtp()`.
8. **No CORS/Helmet/global validation/global prefix/versioning** in
   `main.ts`. Added.

## Architecture added

- **Standard response envelope** for every endpoint (`ApiResponseDto` /
  `ApiErrorResponseDto`) via a global interceptor + exception filter.
- **JWT auth by default**: a global `JwtAuthGuard` protects every route
  unless explicitly marked `@Public()`. Access tokens are short-lived (15m);
  refresh tokens (7d) are rotated on every use and revoked server-side
  (Redis-backed sessions keyed by `jti`), with reuse detection that revokes
  all sessions for a user if a used/unknown refresh token is replayed.
- **RBAC** via `@Roles()` + `RolesGuard` (used to gate the admin Redis
  endpoints).
- **WebSocket auth**: `EventsGateway` verifies the JWT during the socket.io
  handshake (`handshake.auth.token`) and disconnects unauthenticated
  clients; message handlers are double-guarded with `WsJwtGuard`.
- **Structured JSON logging** (`AppLogger`) with a request id attached to
  every log line via `AsyncLocalStorage`, plus an HTTP access log
  (method/path/status/duration) from `RequestContextMiddleware`.
- **Centralized, validated configuration** (`ConfigModule` + `env.validation.ts`)
  — the app now refuses to boot with a missing/weak/reused JWT secret.
- **OWASP hardening**: Helmet, explicit CORS allowlist, global
  `ValidationPipe` (whitelist + forbid unknown properties), app-wide
  `ThrottlerModule` rate limiting in addition to the existing per-mobile/
  per-IP OTP limiter, safe `SCAN`-based Redis key deletion (never `KEYS`),
  and a global exception filter that never leaks stack traces, SQL errors,
  or framework internals to the client.
- **DTOs** for every request/response shape (login, verify-otp, refresh,
  logout, Redis admin ops, user profile) with `class-validator` rules.

## New/changed endpoints (all under `/api/v1` unless noted)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | public | liveness check, unwrapped, unprefixed |
| POST | `/auth/login` | public | body: `{ mobile }` → `{ id, expiresIn }` |
| POST | `/auth/verify-otp` | public | body: `{ id, otp }` → tokens + user |
| POST | `/auth/refresh` | public | body: `{ refreshToken }` → new tokens |
| POST | `/auth/logout` | JWT | body: `{ refreshToken? }` (omit = all devices) |
| GET | `/users/me` | JWT | current user's safe profile |
| POST/GET/DELETE | `/admin/redis[...]` | JWT + `ADMIN` role | debug/ops only |
| WS | `/events` namespace | JWT via handshake | `queue:subscribe` message |

## Setup

1. Copy `.env.example` to `.env` and fill in real secrets (`openssl rand
   -base64 48` for the JWT secrets).
2. `npm install`
3. `npm run start:dev`

## Known follow-ups (flagged, not silently skipped)

- OTPs are logged at debug level in non-production only, as a stand-in for
  a real SMS provider integration (Twilio/MSG91/etc) — wire that up before
  going live.
- Schema changes should go through TypeORM migrations; `DB_SYNCHRONIZE` is
  for local dev only.
