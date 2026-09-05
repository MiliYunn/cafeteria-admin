# APCafeteria Admin

An Angular 21 **client-side rendered** admin portal for the existing Flask backend. Tailwind CSS 4 provides utilities; shared CSS tokens provide the light/dark theme. Lucide icons, reactive forms, and ngx-toastr are included. The blue accent is inspired by [APU's website](https://apu.edu.my/), paired with navy and a soft green secondary accent. This is not an official APU brand kit.

## Run the portal

You need Node.js **22.12 or newer within Node 22**, or Node 24. The tested version is Node 22.20.0. Keep MySQL and your backend configured as before.

Open PowerShell and start the backend:

```powershell
cd "C:\Parallel Universe\AP Caferteria\Repositories\apcafeteria-backend"
.\.venv\Scripts\python.exe manage.py run
```

Open a **second** PowerShell window for the frontend:

```powershell
cd "C:\Parallel Universe\AP Caferteria\Repositories\apcafeteria-frontend"
npm ci
npm start
```

Visit **http://127.0.0.1:5173**. Sign in with an existing, active backend administrator's email and password. The assigned role must also be active and named `admin`. This frontend does not seed users or contain real login credentials.

Keep both terminals open. Press Ctrl+C in a terminal to stop its server. If a port is already in use, use the server already running there or stop that server before starting another copy.

The Angular development server forwards `/cafeteria/**` to `http://127.0.0.1:8000` using `proxy.conf.json`. This includes API calls and uploaded files. No Postman variables or manual token copying are needed. There are no database passwords or JWT secrets in the frontend.

## Pages and API coverage

All protected calls use `/cafeteria/admin` as their base. CRUD means list, view one, create, update, and delete. Lists use server pagination; the four options endpoints return ordinary lists.

| Portal page                   | Backend endpoints                                                          |
| ----------------------------- | -------------------------------------------------------------------------- |
| Sign in                       | `POST /auth/login`                                                         |
| Overview                      | Shop, user, category, payment-method totals; `GET /cafeteria/health`       |
| Users                         | CRUD `/users`, `/users/:id`; `/role-options` for roles                     |
| Roles                         | CRUD `/roles`, `/roles/:id`; `/role-options`                               |
| Categories                    | CRUD `/categories`, `/categories/:id`; `/category-options`                 |
| Genres                        | CRUD `/genres`, `/genres/:id`; `/genre-options`                            |
| Payment methods               | CRUD `/payment-methods`, `/payment-methods/:id`; `/payment-method-options` |
| Shops                         | CRUD `/shops`, `/shops/:id`                                                |
| File library and form uploads | `POST /uploads`, multipart field **file**                                  |
| My account                    | `GET /auth/profile`, `POST /auth/refresh-token`, `POST /auth/revoke-token` |
| Topbar logout                 | `POST /auth/logout`                                                        |

Shop staff and payment accounts are intentionally excluded from the admin portal because they belong to the shop portal.

### List filters

Every list supports `page`, `per_page` (10, 20, 50, or 100 in the UI), `search`, and `is_active`. Additional filters:

| List            | Extra filter keys                  |
| --------------- | ---------------------------------- |
| Users           | `role_id`, `department_id`, `type` |
| Payment methods | `type`                             |
| Other lists     | None                               |

Press **Apply** to fetch the filtered list. The UI sends only supported keys and preserves boolean false values. Reset clears filters. Changing filters or page size returns to page one. No client-side filtering is used to fake server totals.

## Authentication

The login response supplies the access token and refresh token. Both are stored in **sessionStorage** for this tab. Protected requests receive a Bearer access token automatically. If an ordinary request receives 401, the interceptor shares a single refresh request across concurrent failures, saves the rotated token pair, and retries each request once. Failed refresh signs out locally. Login, refresh, logout and revoke are excluded from automatic refresh loops.

**My account → Refresh session** manually rotates the pair. Logout and revoke call their corresponding APIs and clear local credentials. The current backend revokes only the submitted access token; these actions do **not** invalidate all refresh tokens or other devices. If logout cannot reach the backend, the UI clears local credentials and warns that server revocation could not be confirmed.

Session storage is readable by JavaScript, so preventing XSS remains essential. A future backend-supported HttpOnly refresh cookie would provide stronger protection. Never put tokens in source control. Production must use HTTPS.

## Existing backend limitations surfaced in the UI

- Login accepts passwords up to **15 characters**, while user creation accepts 8–128. Use 8–15 characters for accounts that must log in until that backend rule is reconciled. No backend code was changed here.
- There is no notifications API. The bell dropdown contains **this session's local activity**, not server notifications, orders, or an audit log. It resets on sign-out or reload.
- There is no upload listing or deletion API. File library shows uploads from the current page visit only. Files remain on the backend when navigating away.
- Uploaded files are public to anyone with their URL. Do not upload confidential documents. The UI supports local storage only, with the backend's default 5 MB / JPG, JPEG, PNG, WebP, GIF, PDF limits. If backend limits change, update `shared/upload-validation.ts` and the displayed guidance. The server is the final authority on validation.
- Shop opening/closing fields store local clock times only (`HH:MM:SS`), with no date or timezone conversion. Time pickers accept hours, minutes, and seconds; leaving a field blank clears it. Midnight and overnight hours are supported. Apply backend migration `032_shops_time_only` before using these fields with an existing database.
- No order, menu, sales-report, or notification endpoints are registered for admin. No invented pages or revenue figures are included.
- Health confirms the Flask process responds; it does not prove a successful MySQL connection.

## Project structure

```text
src/app/
  core/                 API client, authentication, activity, resource contracts
  layout/               Sidebar, topbar, notifications, theme and logout
  pages/                Login, overview, generic resource CRUD, profile, uploads
  shared/               Icon wrapper, accessible dialog, upload validation
  app.routes.ts         CSR routes and authentication guard
  app.config.ts         HTTP, router, animation and toastr providers
src/styles.css          Tailwind import, theme tokens and responsive UI
public/                 Static favicon
tests/                  Read-only backend smoke tests and isolated UI fixture
proxy.conf.json         Local backend proxy
```

`core/resources.ts` is the central definition of each resource's fields, validators, filters, table columns, and options endpoint. `pages/resource-page` implements the common CRUD workflow without duplicating every page. API requests stay in services; components handle form and view state. IDs and timestamps are read-only, and blank edit passwords are omitted from updates.

Fonts are bundled locally; the portal does not call Google Fonts or external icon CDNs. UI preferences (theme/sidebar) are stored in localStorage; authentication uses sessionStorage.

## Checks

```powershell
npm test          # Angular/Vitest tests with mocked HTTP, no live database
npm run build     # Optimised static CSR build
npm run test:api  # Read-only live backend health + protected-route checks
```

For safe visual testing without changing real data, use these commands in two terminals:

```powershell
npm run test:fixture
```

```powershell
npx ng serve --host 127.0.0.1 --port 5174 --proxy-config tests/proxy.fixture.json
```

Visit http://127.0.0.1:5174 and use **demo@example.com / DemoPass123!**. These are explicit test-only credentials, accepted only by the in-memory fixture on port 18000. Fixture data resets when that process stops. It is not included in the production bundle or used by `npm start`. Use `invalid` as a fixture name to test field-level 422 errors, and `duplicate` to test 409 errors.

## Deploying the CSR build

`npm run build` outputs static assets to `dist/apcafeteria-admin/browser`. Serve that directory with a web server. Configure it to:

1. Proxy `/cafeteria/` to the Flask backend, **before** applying the SPA fallback.
2. Fall back to `index.html` for frontend paths such as `/users` and `/profile`.
3. Use HTTPS, appropriate security headers, and upload size limits consistent with Flask.

There is no SSR server, server rendering dependency, or frontend database connection. The development proxy is not copied into production; configure the equivalent reverse proxy on your deployment host.
