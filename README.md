# ColdGuard — AI Cold-Chain Monitoring (Windows, no Docker)

ColdGuard is a local project using React + Vite, Node.js + Express, MongoDB, a Python FastAPI/Isolation Forest anomaly service, and a sensor simulator. The simulator generates demo telemetry; it is not physical sensor hardware.

## Requirements
- Windows 10/11
- Node.js 20 LTS or newer (npm included)
- MongoDB Community Server running locally, or a MongoDB URI you control
- Python 3.12 recommended for the supplied scikit-learn pin
- Internet access for the first dependency installation

## First-time setup
1. Install/start MongoDB Community Server.
2. Double-click `run-coldguard.bat`. On the first run it creates `backend\.env` and opens it in Notepad.
3. In `backend\.env`, replace `JWT_SECRET` with a unique random value at least 32 characters long and `SENSOR_API_KEY` with a unique random value at least 16 characters long. Keep `DEMO_PASSWORD` at 10+ characters. Save the file and run `run-coldguard.bat` again. The backend loads this file relative to its own source location, so startup does not depend on the shell current directory.
4. The launcher installs npm dependencies and starts backend, AI, simulator and frontend in separate terminal windows. The AI window uses Python 3.12 via `py -3.12`; install Python 3.12 if that launcher cannot find it.
5. Open `http://localhost:5173`.

MongoDB must be running before the backend starts. If services were started too quickly, restart the backend window after MongoDB is ready. Manual instructions are below.

## Manual setup (four terminals)
### Terminal 1 — Backend
```bat
cd backend
copy .env.example .env
```
Edit `backend\.env` before startup. Set `JWT_SECRET` and `SENSOR_API_KEY` to strong random values. Then:
```bat
npm install
npm run dev
```
Backend health: `http://localhost:5000/health`

### Terminal 2 — AI service
Use the checked launcher (it refuses to reuse an existing virtual environment if it is not Python 3.12):
```bat
cd ai-service
call start-ai.bat
```
For manual setup, first inspect any existing `.venv` with `.venv\Scripts\python.exe --version`. If it is not Python 3.12, rename that generated environment after checking it; then run `py -3.12 -m venv .venv`, `.venv\Scripts\activate`, `python -m pip install -r requirements.txt`, and `python -m uvicorn main:app --host 127.0.0.1 --port 8000`. Always use `python -m pip` from the activated environment.
AI health: `http://127.0.0.1:8000/health`

### Terminal 3 — Sensor simulator
```bat
cd sensor-simulator
npm install
npm start
```
It reads `SENSOR_API_KEY` from `backend\.env`. It posts simulated readings for seeded shipment `SH001` every five seconds.

### Terminal 4 — Frontend
```bat
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

## Deploy to Render with MongoDB Atlas
1. Create a MongoDB Atlas cluster. Add a database user, allow network access from Render (or configure Atlas network access for your deployment), and copy the application connection string. Replace its password/database placeholders; never commit it.
2. Push this repository to GitHub, then in Render choose **New → Blueprint** and select the repository. Render reads `render.yaml` and creates the Express API, Python AI service, and Vite static site.
3. In the Render Blueprint environment prompts, set:
   - `MONGO_URI`: your Atlas connection string.
   - `JWT_SECRET`: a unique random secret of at least 32 characters.
   - `SENSOR_API_KEY`: a unique random key of at least 16 characters.
   - `DEMO_PASSWORD`: a unique password of at least 10 characters for accounts seeded on first startup. Existing user passwords are not changed by reseeding.
   - `CORS_ORIGIN`: the exact deployed frontend origin, for example `https://coldguard-frontend.onrender.com` (no trailing slash).
   - `AI_SERVICE_URL`: the deployed AI service base URL, for example `https://coldguard-ai.onrender.com` (no trailing slash).
   - `VITE_API_URL`: the deployed backend URL plus `/api`, for example `https://coldguard-api.onrender.com/api`.
   If Render assigned different service URLs, use those actual URLs instead of the examples.
4. Wait for all three deployments to finish. Verify the API at `<backend URL>/health` reports database `connected` and the AI service at `<AI URL>/health` returns `status: ok`.
5. Open the deployed frontend URL, sign in with an account that exists in the Atlas database, and verify API requests in the browser Network panel.

The API and AI services must be publicly reachable by the browser/backend respectively; do not make Atlas public without appropriate access controls. This setup does not deploy the sensor simulator. Sensor data appears only after a simulator or real device is separately configured to send readings to the deployed API using its `SENSOR_API_KEY`. Accounts from a local database are not automatically copied to Atlas.

## Demo accounts
On first backend startup, the application seeds the following accounts if their emails do not already exist. Password is the `DEMO_PASSWORD` value from `backend\.env` (default below):

| Role | Email | Default demo password |
|---|---|---|
| Admin | `admin@coldchain.local` | `ColdGuard@123` |
| Manager | `manager@coldchain.local` | `ColdGuard@123` |
| Operator | `operator@coldchain.local` | `ColdGuard@123` |
| Viewer | `viewer@coldchain.local` | `ColdGuard@123` |

These are development-only demo accounts. Change the password for any existing seeded accounts from the Admin User Administration screen. Seed passwords are only applied when the account is first created; changing `DEMO_PASSWORD` later does not overwrite existing account passwords.

## Role permissions
- **Admin:** dashboard and all pages; create shipments/vehicles/warehouses; resolve alerts; create users, change roles, disable accounts, reset passwords, and view/export audit logs.
- **Manager:** monitor operations and analytics/compliance; create shipments/vehicles/warehouses; resolve alerts.
- **Operator:** view operational data and resolve alerts; cannot create shipments/vehicles or manage users.
- **Viewer:** read-only dashboard, monitoring, shipments, vehicles and alerts.

Backend middleware enforces authorization; hiding frontend controls is only a usability layer. Public registration always creates a Viewer account. Admin account roles cannot be assigned through public registration.

## API overview
- `POST /api/auth/login`
- `POST /api/auth/register` (Viewer-only)
- `GET /api/dashboard/summary`
- `GET /api/shipments`, `GET /api/shipments/:id`, `POST /api/shipments` (Admin/Manager)
- `GET /api/sensor/readings` (authenticated)
- `POST /api/sensor/readings` (requires `x-sensor-key` header)
- `GET /api/alerts`, `PUT /api/alerts/:id/resolve` (Admin/Manager/Operator)
- `GET /api/vehicles`, `POST /api/vehicles` (Admin/Manager)
- `GET /api/warehouses` (authenticated); `POST /api/warehouses`, `PATCH /api/warehouses/:id`, `DELETE /api/warehouses/:id` (Admin/Manager)
- `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id`, `PUT /api/admin/users/:id/password`, `GET /api/admin/audit-logs` (Admin only)

Warehouse records store name, location, capacity, status, and optional linked shipment IDs. The hub page derives temperature, humidity, and unresolved alerts from actual readings/alerts for those linked shipments; an unlinked hub or shipment without readings displays no telemetry.

## Automated checks
From the project root, run `cd backend` then `npm test`. The included built-in Node tests verify key security contracts, environment loading/database readiness, and AI client timeout/response checks. These are mostly source-contract tests, not a replacement for full HTTP/database integration tests. A production frontend build and live MongoDB/AI end-to-end test still need to be run on the target Windows machine.

## Safety and limitations
- The AI service is a small Isolation Forest anomaly detector fit against a recent sliding window. It is a demonstration signal, not a validated medical/pharmaceutical safety model. Do not use it as the sole basis for real shipment safety decisions.
- Sensor readings are simulated unless you integrate actual devices.
- The `SENSOR_API_KEY` is for local demonstration. For real deployments, use TLS, rotate secrets, use managed secret storage, rate limiting, and device-specific credentials.
- `ColdGuard` provides monitoring evidence; it does not itself certify regulatory compliance.
- Before public deployment, disable or replace demo accounts, configure secure origins and production secrets, and conduct security and end-to-end tests.
