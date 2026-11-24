# Tablelane · Admin Workspace testing milestone

Open the private workspace to edit and publish a restaurant menu. Guests scan a stable table QR and see the last published version. This milestone uses SQLite, filesystem uploads and a single import worker. Staff accounts, invitations, permissions and the ordering backend are deferred.

## Windows setup

Use Python 3.12, Node 22.12+ and separate VS Code PowerShell terminals. Run the commands from the repository root unless a directory is specified.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

In `backend/.env`, use the values below. Replace the example IP with your computer's **Wi-Fi IPv4 address** from `ipconfig`. The phone must be on a network that can reach that address. For a hosted guest menu, use its HTTPS origin instead.

```dotenv
DATABASE_URL=sqlite:///./data/tablelane.db
UPLOAD_DIR=./data/uploads
PUBLIC_MENU_BASE_URL=http://192.168.1.25:3001
FRONTEND_ORIGIN=http://127.0.0.1:3000,http://localhost:3000
ADMIN_HOSTS=localhost,127.0.0.1
GOOGLE_APPLICATION_CREDENTIALS=
```

Paths are resolved relative to `backend/`. Setup runs Alembic and inserts the test restaurant and branch once. Stable IDs let you rename both and rerun setup while preserving menus, revisions, tables and files. Switch existing configuration files to the new examples when upgrading from the earlier hosted-database prototype. This starts a separate SQLite workspace.

```powershell
# In backend
.\.venv\Scripts\python -m app.bootstrap
# To apply subsequent migrations alone
.\.venv\Scripts\python -m alembic upgrade head
```

Start the following three processes in **separate terminals**, each in `backend`:

| Process | PowerShell command |
| --- | --- |
| Private management API | `.\.venv\Scripts\python -m uvicorn app.private:app --host 127.0.0.1 --port 8010` |
| Guest read-only API | `.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8012` |
| Single import worker | `.\.venv\Scripts\python -m app.worker` |

Install the frontend and start the **guest frontend** in another terminal:

```powershell
cd frontend
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
$env:WORKSPACE_MODE = "public"
$env:NEXT_DIST_DIR = ".next-guest"
npm run build
npx next start --hostname 0.0.0.0 --port 3001
```

Allow the guest port 3001 on the private LAN if Windows Firewall asks. In a **fresh terminal**, start the private frontend:

```powershell
cd frontend
$env:WORKSPACE_MODE = "private"
npm run dev
```

Open **http://127.0.0.1:3000** on the manager's computer. The workspace opens directly. `PRIVATE_API_ORIGIN` and `PUBLIC_API_ORIGIN` in the frontend example point to the two local APIs. Next.js forwards same-origin browser requests to those services. The guest homepage explains how to open a table menu. Each printed QR links directly to its table at `/menu/<table-id>`.

## Imports, photos and publication

- Manual entry, photo/PDF upload and existing QR/HTTPS menu links feed the same draft. Text PDFs work without OCR credentials. For menu photos and scanned PDFs, enable Google Cloud Vision and set `GOOGLE_APPLICATION_CREDENTIALS` to the worker's credential file outside Git. Restart the worker after editing its environment. Failed pages report the setup dependency and can be retried. QR decoding uses zxing-cpp.
- Original uploads live under `UPLOAD_DIR/<restaurant_id>/<branch_id>/originals/`. Only the private API serves originals. The dish editor accepts a separate customer-facing photo and writes a resized JPEG under `photos/`. Publishing approves the photos referenced by active dishes. The public image endpoint checks the current snapshot on every request.
- SQLite serializes the revision check and menu write. Publishing an incomplete draft leaves the prior guest snapshot available. A price update keeps the existing table QR valid.

## Hosted demo

Run the APIs and worker on a persistent host with access to **the same SQLite file and upload directory on a local durable disk**. Use absolute volume paths for the database and `UPLOAD_DIR`. Back up both together. Keep files outside the web root. Replacing a container must remount that volume. Per-instance temporary filesystems, multiple independent replicas and network shares are unsuitable for this SQLite setup.

Expose only the **public frontend** and `app.main:app` to the internet. Bind `app.private:app` and the private frontend to loopback, or restrict both with a private network/VPN firewall. The private API allows management without credentials. Host and Origin checks supplement the network restriction. If using a private reverse proxy, configure its host in `ADMIN_HOSTS` and the exact manager origin in `FRONTEND_ORIGIN`.

For Vercel, the root `vercel.json` deploys only the Next.js frontend. Import `deploy/vercel/.env.example`, select `WORKSPACE_MODE=public`, set `PUBLIC_API_ORIGIN` to the persistent read-only API origin and redeploy. Use separate private and public frontend builds. Rewrites are generated at build time. Set the backend's `PUBLIC_MENU_BASE_URL` to the Vercel guest origin before printing. This version requires no Supabase keys. Existing hosted databases and storage are separate from the new test workspace.

## Modules and tests

- `frontend/src/app` contains thin routes. `frontend/src/modules/admin-workspace` contains settings, stations, tables, manual editing and import review. `customer-menu` renders published menus.
- `table-ordering`, `waiter-floor`, `kitchen-display`, `guest-tracker`, `billing`, `reports` and `guest-experience` use typed local fixtures in the **private development** preview.
- `backend/app/modules/admin_workspace` owns menu rules, the server-selected restaurant, original files and approved photos. `backend/app/core` owns the database configuration.

```powershell
cd backend
.\.venv\Scripts\python -m pytest -q
cd ../frontend
npx playwright install chromium
npm test
```

Stop other Next.js processes using this checkout's build directories before running the browser tests. The browser runner uses its own disposable database, files, two frontends, two API processes and worker. It reruns setup, restarts the services, decodes a generated QR and opens it through the guest frontend at a mobile viewport. OCR responses are deterministic in automated tests. Live Vision recognition, physical printing and a real phone scan require the provider and device.

## Manager review

1. Open the private workspace and add a kitchen station and **Table 5**.
2. Import a PDF, review the original, correct one price and apply it. Add a manual dish and upload a customer-facing photo.
3. Preview the draft, publish, and print Table 5's QR. Scan it with a phone and open the menu.
4. Change a price in the draft. Refresh the phone to verify the published price stays visible. Publish again and refresh through the same QR.
