# ColdGuard implementation notes

## Changes in this revision
- Removed Docker and Docker Compose files from the deliverable; added a Windows `.bat` launcher and manual commands.
- Added four seeded demo roles (Admin, Manager, Operator, Viewer).
- Public registration always creates a Viewer account.
- Added backend role checks and database-backed account status/role checks for each JWT request.
- Added token-version invalidation after an admin password reset.
- Added Admin user management (create user, change role, enable/disable, reset password) and audit log review/export.
- Added audit records for login, registration, user changes, shipment/vehicle creation and alert resolution.
- Protected simulator sensor ingestion with an `x-sensor-key` header and added bounds validation for sensor readings and GPS.
- Added duplicate-open-alert suppression, shipment temperature range validation, and vehicle shipment-reference validation.
- Added compliance telemetry CSV export and session cleanup when an authenticated API request returns 401.
- Added five static security-contract tests.

## Checks run in this environment
- Node syntax checks: passed for backend and simulator JavaScript files.
- Python syntax compilation: passed for `ai-service/main.py`.
- TypeScript compiler JSX parse check: passed for frontend JSX/JS files.
- `node --test backend/test/*.test.js`: 5 passed, 0 failed.

## Not verified here
- npm dependency installation did not complete within the available execution window, so a Vite production build was not run.
- No live MongoDB service was available, so database-backed login, seed, CRUD, role denial, and telemetry end-to-end flows were not executed.
- The Windows `.bat` launcher has not been executed on a Windows desktop in this environment.
- The AI Isolation Forest is a demonstration model only; it is not validated for real pharmaceutical or food safety decisions.

## Audit and repair pass (2026-10-21)

### Defects addressed
- Backend dotenv loading depended on the process working directory. It now resolves `backend/.env` relative to `src/server.js`, while preserving externally supplied environment variables.
- The backend `/health` route previously hard-coded `database: connected`. It now checks Mongoose connection readiness and returns HTTP 503 if the connection is not ready.
- Backend startup now reports a direct missing-`MONGO_URI` message and rejects obvious placeholder JWT/sensor secrets instead of accepting the example values merely because they meet the length checks.
- AI calls could hang on a slow/unavailable service and accepted unchecked response JSON. The client now has a 3-second timeout, validates the response contract, logs the failure reason without secrets, and explicitly labels AI as unavailable while retaining temperature-threshold checks.
- AI request validation now bounds temperature/humidity, rejects non-finite values, limits history size, and sanitizes validation errors so non-standard `NaN` input does not break the error response.
- The frontend's static `API Connected` indicator claimed connectivity without checking it; the label now says `Session Active`. Removed the hard-coded demo password from the login hint and removed the always-green system-health claim.
- Added `.gitignore` coverage for `.env` files (while allowing `.env.example`), dependency directories, build output, Python virtual environments, and bytecode.
- Added a Python 3.12 AI launcher that checks an existing `.venv` interpreter before reuse and installs dependencies with the environment's `python -m pip`. The main launcher now fails clearly if Python 3.12 or npm installation is unavailable.
- Added contract tests for backend env resolution/readiness and AI timeout/response validation.

### Tests run in the audit environment
- `node --check` for all backend and simulator JavaScript files: passed.
- `node --test backend/test/*.test.js`: 7 passed, 0 failed.
- `python -m py_compile ai-service/main.py`: passed under Python 3.13.5.
- AI FastAPI TestClient checks using the environment's installed libraries (not the pinned project venv): `/health` 200; empty history 200; valid history 200 with expected keys; out-of-range humidity 422; `NaN` temperature 422; 501 readings 422.
- Backend `npm install --no-audit --no-fund` did not complete within the 120-second execution limit. Frontend build and simulator dependency installation were therefore not verified.
- Python 3.12 and MongoDB are not installed/available in this audit environment. The pinned requirements were not installed into the requested Python 3.12 environment; database-backed integration and Windows batch execution remain unverified.
