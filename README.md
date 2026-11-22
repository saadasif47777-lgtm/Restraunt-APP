# Tablelane restaurant workspace

A restaurant manager can maintain a private branch menu, import an existing menu, publish a snapshot, and print a stable table QR. The public route serves the latest published snapshot. Ordering, service, billing and reporting are development previews.

## Repository map

| Path | Contents |
| --- | --- |
| `frontend/src/app` | Thin Next.js App Router entry points |
| `frontend/src/modules/admin-workspace` | Branch settings, staff, tables, stations, menu editor and import review |
| `frontend/src/modules/customer-menu` | Read-only published table menu |
| `frontend/src/modules/{table-ordering,waiter-floor,kitchen-display,guest-tracker,billing,reports,guest-experience}` | Interactive screens and module-local typed sample data |
| `backend/app/modules/admin_workspace` | Membership, drafts, versions, public table lookup and imports |
| `backend/app/core` | Supabase JWT verification and SQLAlchemy connection |
| `backend/app/worker.py` | Single resumable import worker |
| `backend/migrations`, `backend/tests`, `frontend/tests` | Alembic, PostgreSQL integration tests and Playwright journeys |

## Start the frontend on Windows

Use Node 22.12+ and Python 3.12. Open the repository folder in VS Code. From a PowerShell terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open port 3000 in your browser. With both public Supabase variables empty, development mode opens a sample restaurant. Its draft persists in browser local storage. **Development previews** in the sidebar opens the seven future workspaces. Production requires staff authentication and returns 404 for preview routes.

## Connect a real branch

1. In Supabase, enable email authentication, configure the app site URL and invitation redirect URL, and use an asymmetric JWT signing key (ES256 or RS256). Create a confirmed owner account through the Supabase dashboard. Copy its user UUID.
2. Create a **private** Storage bucket called `menu-originals`. Keep direct client access to originals disabled. FastAPI authorizes access by branch. Configure email delivery for staff invitations.
3. Copy `backend/.env.example` to `backend/.env`. Set the Supabase project URL, server service-role key, PostgreSQL connection string and frontend origin. Use a trusted PostgreSQL role that can migrate tables and access them with RLS enabled. Use the direct or session-pooler connection. URL-encode special characters in the database password.
4. Copy `frontend/.env.example` to `frontend/.env.local`. Set the project URL, public anon/publishable key and browser-reachable FastAPI URL. Restart Next.js after changing public variables.
5. For photos and scanned PDFs, enable Google Cloud Vision and point `GOOGLE_APPLICATION_CREDENTIALS` at the server-side credential file outside the repository. Embedded-text PDFs and manual editing work independently of Vision.

From the repository root:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m app.bootstrap --subject "<owner-user-uuid>" --email "owner@example.com" --restaurant "Saffron House" --branch "Gulberg"
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run bootstrap once per new restaurant. Subsequent branches and invitations are available within the workspace. Owners can invite staff to their branch. Managers can edit and publish menus. Waiter, cashier and cook roles are reserved for later live workflows.

In a separate terminal, start **one worker**:

```powershell
cd backend
.\.venv\Scripts\python -m app.worker
```

The worker saves each completed page. Review the extracted text and uploaded original before applying dishes to the draft. Ambiguous prices remain blank. For revisions, compare proposed price changes and explicitly select removals. Multi-portion price changes require individual review in the editor. Supported links are public HTTPS HTML, images or PDFs. For login-protected or JavaScript-only menus, upload screenshots.

## Run the tests

Use a disposable PostgreSQL database ending in `_test`. From PowerShell in `backend`:

```powershell
$env:DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@localhost:5432/tablelane_test"
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m pytest -q
$env:SUPABASE_URL = "http://127.0.0.1:8011"
$env:FRONTEND_ORIGIN = "http://127.0.0.1:3011"
.\.venv\Scripts\python -m uvicorn tests.browser_services:app --host 127.0.0.1 --port 8011
```

The loopback browser harness creates disposable owners, signs short-lived test JWTs, serves private test files and runs the import worker. It is for the test database only. In a second terminal, from `frontend`:

```powershell
npx playwright install chromium
npm test
npm run build
```

Stop other Next.js processes using this checkout before running browser tests or building. To use an installed Chromium executable, set `CHROMIUM_PATH`. Pytest exercises PostgreSQL, deterministic OCR results, PDF extraction and QR decoding. Browser tests exercise FastAPI and the database with a local Supabase-compatible provider. Hosted email delivery, hosted Storage, live Vision recognition and a physical phone scan require separate checks.

## First branch walkthrough

1. Sign in as the owner and add a kitchen station. In **Tables & QR**, add **Table 5**.
2. Open **Menu imports**, upload a menu PDF or photo, then choose **Review additions**. Compare the original, correct a price and apply the rows to the draft.
3. In **Menu manager**, add Chicken Karahi, assign Curry, enter Half at PKR 950 and Full at PKR 1,700, and add Extra ginger at PKR 50. Open **Preview menu**, then **Publish menu**.
4. Print Table 5's QR and scan it. The phone must be able to reach both the frontend and API. Use an HTTPS deployment or set the frontend/API URLs and CORS origin to reachable development addresses before generating the QR. Open the admin workspace at that same guest-reachable frontend origin.
5. Edit a price, publish again and refresh the guest menu using the same QR.

## Milestone verification

The development run passed eight pytest cases on PostgreSQL 16 and two Chromium Playwright tests. The browser journey signed in through a test identity provider, created a branch and kitchen station, invited a waiter, imported a text PDF, corrected its price, and published it alongside a manually entered dish. It decoded the generated Table 5 QR image, opened its URL, and verified a subsequent price update. Layout checks used widths of 390, 768 and 1,366 pixels.

Photo and scanned-PDF tests used deterministic Vision responses. A live Vision smoke attempt stopped with `DefaultCredentialsError` during credential initialization. Hosted Supabase sign-in, email delivery, private Storage, live OCR recognition, physical printing and a phone scan still need a connected restaurant project and device.

## Deploy the web workspace on Vercel

The root `vercel.json` declares two services. Set the Vercel project's **Root Directory** to the repository root and use the branch containing this configuration. The frontend uses `/api` on the same origin. Vercel routes those requests to FastAPI and removes the prefix. Both services use the project's environment settings. Only the three `NEXT_PUBLIC_` values are public.

1. Download [the Vercel environment template](deploy/vercel/.env.example) and save a local copy as `.env`. Enter the same Supabase project URL in both URL fields, the publishable key, the server secret or legacy service-role key, and the transaction-pooler connection URI from **Connect**. URL-encode special characters in the database password. Keep the completed file private.
2. In **Vercel → Project → Settings → Environment Variables**, import the file for **Production** and redeploy. Configure a separate Supabase project for isolated preview data if needed. Same-origin deployments do not require a custom CORS origin.
3. In Supabase, set the Auth site URL and allowed redirects to your deployed frontend, create the private Storage bucket, and configure asymmetric JWT signing. Run the migrations and bootstrap the first owner once using the Windows commands above and a direct or session-pooler database connection.
4. For imports, run one persistent `python -m app.worker` process on a worker host with the backend environment settings. Supply Google Vision credentials there for scanned images. The two Vercel web services handle HTTP requests. The worker consumes queued imports independently.
5. Sign in, open the branch menu and publish a draft. Opening a generated table QR verifies that public reads reach the same backend. A signed-out GET to `/api/branches` should return an HTTP authentication error with a JSON body.
