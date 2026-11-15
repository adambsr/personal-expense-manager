<p align="center">
  <img src="frontend/public/em-logo.png" alt="Personal Expense Manager logo" width="560" />
</p>

<h1 align="center">Personal Expense Manager</h1>

<p align="center">A straightforward way to record everyday finances and understand monthly cash flow.</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white">
</p>

## About the project

Personal Expense Manager is a web application for keeping personal income and expenses organized. Members can record transactions, group them by category, and review their activity through a monthly dashboard and searchable transaction history.

The project focuses on the everyday questions that can be hard to answer from scattered notes or statements: how much came in, how much was spent, and where the activity occurred. It provides a single place to manage that information and see a summary over time.

## Features

- **Account access:** Register, sign in, and restore an authenticated session.
- **Monthly dashboard:** Review income, expenses, and balance, with weekly and monthly cash-flow charts, spending by category, and recent transactions.
- **Transaction management:** Create, view, edit, and delete income and expense records, including amount, date, description, category, and optional recurrence frequency.
- **Transaction discovery:** Search descriptions; filter by type, category, and date range; sort and paginate results.
- **Categories:** Start with default income and expense categories, then create, rename, and delete personal categories.
- **Profile:** Update first and last name, and upload or remove a JPEG, PNG, or WebP profile image.
- **Light and dark themes:** Switch themes from the application header. The choice is saved in the browser; on the first visit, the application follows the device color preference. Theme styling also applies to sign-in, registration, and administration screens.
- **Administration:** Administrators get an overview of application activity, can search and manage user accounts (including access roles and account activation), and manage global income and expense categories and whether they are added to new accounts.

Recurring frequency is recorded with a transaction; the application does not automatically generate future transactions.

## Screenshots

There are no verified screenshots of the running application in the repository yet. The images under [`designs/`](designs/) are design mockups, not screenshots of the current build, and include concepts that are not implemented. They are therefore not presented as the application's current interface here.

To add screenshots later, capture the running application with representative sample data, remove or mask personal information, and save the images under a dedicated folder such as `screenshots/`. Replace this note with Markdown image links to those files, with a short caption for each screen and viewport (for example, dashboard — desktop, transactions — mobile, administration — desktop). Check that each image reflects the current build before committing it.

## Technology

| Area | Technologies | Use |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite 8 | Single-page application and development server |
| Styling and UI | Tailwind CSS 4, Base UI, local shadcn-style components | Responsive styling and accessible interface primitives |
| Charts and forms | Recharts, React Hook Form, Zod, Sonner | Dashboard visualizations, validated forms, and notifications |
| Backend | Node.js, Express 5, TypeScript | JSON REST API |
| Data | PostgreSQL 17, Prisma 7 | Relational storage, migrations, generated client, and decimal money values |
| Authentication | JWT, Argon2id | Short-lived bearer access tokens and password hashing |
| Quality tools | Vitest, ESLint, TypeScript compiler | Backend tests, frontend linting, and type/build checks |

The frontend package also includes React Testing Library and Playwright dependencies. No frontend test script or frontend test files are currently present. Prettier is not configured in the package manifests.

## Architecture

```text
Browser (React + Vite)
        │ /api requests (Vite proxies to localhost:4000 in development)
        ▼
Express REST API
  ├── Authentication and profile
  ├── Categories
  ├── Transactions
  └── Dashboard summaries
        │ Prisma Client + PostgreSQL adapter
        ▼
PostgreSQL
```

The backend groups HTTP routes, controllers, validation, and business operations by feature. Prisma models users, categories, and transactions; transaction amounts use `DECIMAL(12,2)`. Database migrations live in `backend/prisma/migrations/`.

The administration area is available to accounts with the `ADMIN` role. It shares the application header and navigation, and provides an overview, user management, and global category management.

### API overview

Private endpoints require an `Authorization: Bearer <token>` header.

Every `/api/admin` endpoint also requires an authenticated administrator account.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in and receive an access token |
| `GET`, `PUT` | `/api/auth/me` | Read or update the signed-in user's profile |
| `GET`, `PUT`, `DELETE` | `/api/auth/me/avatar` | Read, upload, or remove the profile image |
| `GET`, `POST` | `/api/categories` | List or create categories |
| `GET`, `PATCH`, `DELETE` | `/api/categories/:categoryId` | Read, update, or delete a category |
| `GET`, `POST` | `/api/transactions` | List (with filters and pagination) or create transactions |
| `GET`, `PATCH`, `DELETE` | `/api/transactions/:transactionId` | Read, update, or delete a transaction |
| `GET` | `/api/dashboard/summary` | Retrieve dashboard totals and cash-flow summaries |
| `GET` | `/api/admin/overview` | Retrieve application-wide account, transaction, and activity summaries |
| `GET`, `POST` | `/api/admin/users` | List and filter user accounts, or create an account |
| `GET`, `PATCH` | `/api/admin/users/:userId` | Read account details or update the user's role and activation status |
| `GET`, `POST` | `/api/admin/categories` | List or create global income and expense categories |
| `PATCH` | `/api/admin/categories/:categoryId` | Update a global category and its default-onboarding setting |
| `GET` | `/api/health` | Check API availability |

## Getting started

### Prerequisites

- Node.js and npm (compatible with the installed Vite and TypeScript versions)
- Docker with the Docker Compose plugin
- Git, if cloning the repository

### 1. Get the project and install dependencies

```bash
git clone <repository-url> personal-expense-manager
cd personal-expense-manager

cd frontend
npm ci
cd ../backend
npm ci
cd ..
```

Replace `<repository-url>` with the clone URL for your copy of the project.

### 2. Configure the database and backend

Copy the root environment template for Docker Compose and the backend template for the API. In PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

On macOS/Linux, use `cp .env.example .env` and `cp backend/.env.example backend/.env` instead.

Set a private local value for `POSTGRES_PASSWORD` in the root `.env`. In `backend/.env`, replace `YOUR_LOCAL_PASSWORD` in `DATABASE_URL` with that same value, and set a private `JWT_SECRET` of at least 32 characters. Keep both `.env` files local; they are ignored by Git.

Start PostgreSQL from the project root:

```bash
docker compose up -d
docker compose ps
```

Generate Prisma Client and apply the existing development migrations:

```bash
cd backend
npm run db:generate
npm run db:migrate
```

`db:migrate` runs Prisma's development migration workflow. If you make a schema change during development, Prisma may ask for a migration name.

To fill the site with local demonstration data, run this from `backend/` after migrations:

```bash
npm run db:seed:demo
```

This adds 50 fake member accounts, personal categories, and sample transactions spread across the last year without clearing existing records. It can be rerun safely. The demo login is `demo.user@example.com` with password `DemoFinance123!`; the other generated accounts use the same password. The script only permits a localhost database by default and is intended for local demonstrations.

### 3. Run the API and frontend

Open two terminals from the project root.

Terminal 1 — backend:

```bash
cd backend
npm run dev
```

The API listens on `http://localhost:4000`. Its health endpoint is `http://localhost:4000/api/health`.

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). In development, Vite proxies `/api` requests to the API on port `4000`.

To stop PostgreSQL while preserving its database volume, run `docker compose stop` from the project root. `docker compose down` removes the container but preserves the volume. Avoid `docker compose down -v` unless you intend to delete the local database data.

### Troubleshooting

- **Compose reports that `POSTGRES_PASSWORD` is missing:** Check that the root `.env` exists and has a non-empty `POSTGRES_PASSWORD`.
- **The API cannot connect to PostgreSQL:** Make sure the database container is running and the password in `backend/.env`'s `DATABASE_URL` matches the root `.env` value.
- **Authentication configuration fails at startup:** Set `JWT_SECRET` in `backend/.env` to at least 32 characters.
- **Port already in use:** Free ports `5432`, `4000`, or `5173`, or adjust the relevant service configuration. The Vite development proxy targets `http://localhost:4000` by default.

## Environment variables

| Variable | File | Required | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_USER` | Root `.env` | No | PostgreSQL user; Compose defaults to `expense_user` |
| `POSTGRES_PASSWORD` | Root `.env` | Yes | Local database password used by the PostgreSQL container |
| `POSTGRES_DB` | Root `.env` | No | Database name; Compose defaults to `expense_manager` |
| `DATABASE_URL` | `backend/.env` | Yes | Prisma connection URL; use the same username, password, and database as Compose |
| `PORT` | `backend/.env` | No | API port; defaults to `4000` |
| `JWT_SECRET` | `backend/.env` | Yes | Secret used to sign and verify access tokens; minimum 32 characters |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | `backend/.env` | No | Access-token lifetime in seconds; defaults to `900` (15 minutes) |
| `VITE_API_BASE_URL` | `frontend/.env` (optional) | No | Optional API base URL; defaults to the same-origin `/api` path handled by Vite's development proxy |

Both checked-in environment templates contain placeholders, not working credentials. Do not commit populated `.env` files.

## Tests and quality checks

Run commands from the indicated package directory:

| Check | Command | Directory |
| --- | --- | --- |
| Backend API tests | `npm test` | `backend/` |
| Backend type check | `npm run typecheck` | `backend/` |
| Backend production build | `npm run build` | `backend/` |
| Frontend lint | `npm run lint` | `frontend/` |
| Frontend TypeScript check and production build | `npm run build` | `frontend/` |

The backend test suite uses Vitest. The frontend build runs TypeScript project checks before Vite builds the production assets. There is currently no frontend test script or configured formatter command.

## Project structure

```text
.
├── AGENTS.md                    # Project engineering and contribution guidance
├── SETUP.md                     # Detailed development setup notes
├── docker-compose.yml           # Local PostgreSQL service
├── .env.example                 # Docker Compose variable template
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Database migrations
│   │   └── schema.prisma        # PostgreSQL data model
│   ├── src/
│   │   ├── modules/             # Auth, categories, transactions, dashboard
│   │   ├── middleware/          # Authentication, validation, error handling
│   │   ├── config/              # Backend configuration
│   │   ├── lib/                 # Prisma client setup
│   │   ├── app.ts               # Express app and route registration
│   │   └── server.ts            # API process entry point
│   ├── tests/                   # API tests
│   ├── .env.example             # Backend environment template
│   └── package.json             # Backend scripts and dependencies
├── designs/                     # Design reference mockups (not app screenshots)
└── frontend/
    ├── public/                  # Static assets, including em-logo.png
    ├── src/
    │   ├── features/            # Auth, dashboard, transactions, profile, about
    │   ├── components/          # Shared and UI components
    │   ├── lib/                 # Frontend helpers
    │   ├── App.tsx               # App shell and page navigation
    │   └── main.tsx              # Frontend entry point
    ├── vite.config.ts            # Vite, Tailwind, and API proxy setup
    └── package.json              # Frontend scripts and dependencies
```

## Security notes

- Passwords are hashed with Argon2id; password hashes are not returned in user responses.
- The API issues short-lived JWT access tokens (15 minutes by default) and verifies their signature, algorithm, issuer, and audience.
- The frontend keeps the access token in browser `sessionStorage` and sends it as a bearer token. This limits persistence to the browser session; it is not an HttpOnly-cookie design.
- Protected routes use authentication middleware, and database operations scope user-owned records to the authenticated user.
- Request inputs are validated with Zod, and avatar uploads accept JPEG, PNG, or WebP data up to 1 MB.

Use unique local secrets and do not commit credentials. The measures described here do not replace a production security review or deployment-specific configuration.

## License

There is no root `LICENSE` file. The backend's `package.json` currently declares `ISC`, but no project-wide license has been confirmed. Please confirm the intended repository license before adding or advertising one.
