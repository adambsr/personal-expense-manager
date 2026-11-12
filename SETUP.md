# Personal Expense Manager — Setup Guide

This guide takes the project from an empty folder to a working local development environment. Follow it in order; don't install everything at once.

## Decisions already approved

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Lucide React, Recharts, React Hook Form, Zod
- Node.js + Express + TypeScript REST API
- PostgreSQL + Prisma
- Custom Express JWT authentication
- Docker Desktop for local PostgreSQL
- Google Stitch for design; Codex for implementation
- Clean Code and pragmatic SOLID; no overengineering
- No GitHub workflow
- Agile backlog/sprints already complete; development only

---

## Phase 1 — Install computer-level tools

### 1. Install Node.js (LTS)

Download and install the current **LTS** version:

https://nodejs.org/

It includes npm. You do not separately download React, Express, Prisma, or shadcn as desktop programs.

After installation, open a **new VS Code terminal** and check:

```bash
node --version
npm --version
```

Both commands should print version numbers.

### 2. Install Docker Desktop

Download:

https://www.docker.com/products/docker-desktop/

Install it, launch Docker Desktop, and wait until it reports that Docker is running.

Verify in VS Code terminal:

```bash
docker --version
docker compose version
```

Docker will run PostgreSQL for us. **Do not install PostgreSQL separately** for this setup.

### 3. Optional: install DBeaver

https://dbeaver.io/download/

DBeaver is a visual database client. It is optional; Prisma and SQL commands work without it. It is useful for browsing tables and inspecting data.

### 4. VS Code extensions

Install/check these from the VS Code Extensions panel:

- **Codex** (OpenAI) — you already use this.
- **ESLint** — editor feedback for lint issues.
- **Prettier - Code formatter** — consistent formatting.
- **Prisma** — Prisma schema highlighting/formatting.
- **Docker** (Microsoft) — convenient container visibility.
- **Tailwind CSS IntelliSense** — autocomplete for Tailwind classes.

These extensions improve the editor; they do not install the underlying project dependencies.

---

## Phase 2 — Create the project folders

Choose a parent directory for your project and open it in VS Code.

Suggested simple structure:

```text
personal-expense-manager/
├── AGENTS.md
├── docs/
│   └── SETUP.md
├── frontend/
└── backend/
```

Do not add GitHub, sprint/backlog, or planning files.

### Create the frontend

In VS Code terminal, from the project root:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints (usually http://localhost:5173). Confirm the starter screen works.

Stop the server with `Ctrl+C` before continuing if desired.

---

## Phase 3 — Configure the frontend UI

Run commands from the `frontend/` directory.

### 1. Install Tailwind CSS v4 for Vite

```bash
npm install tailwindcss @tailwindcss/vite
```

Update `frontend/vite.config.ts` to include Tailwind's Vite plugin alongside React. A typical config:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Replace the contents of `frontend/src/index.css` with:

```css
@import "tailwindcss";
```

### 2. Initialize shadcn/ui

From `frontend/`:

```bash
npx shadcn@latest init
```

Follow the prompts. Use a style/theme you like; keep it consistent with the Stitch design later.

The CLI sets up the component system and supporting files. shadcn is not a separate desktop download.

### 3. Add components only when needed

Examples:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add table
npx shadcn@latest add form
npx shadcn@latest add sidebar
npx shadcn@latest add skeleton
```

You do **not** need to install every component now. Add components when a screen requires them.

### 4. Install frontend libraries

```bash
npm install lucide-react recharts react-hook-form zod @hookform/resolvers sonner
```

Optional later, only if the app needs them:
- React Router for navigation
- TanStack Query for API/server-state management

Do not add a state-management library (Redux/Zustand/etc.) by default.

### 5. Verify frontend

```bash
npm run dev
```

Check the page loads and no build errors occur. For a production build:

```bash
npm run build
```

---

## Phase 4 — Set up PostgreSQL with Docker

At the project root, copy `.env.example` to `.env` and set a private local password in `POSTGRES_PASSWORD`. If `.env` already exists, edit only the required variables; do not replace existing local values. The root `.env` is ignored by Git.

Compose reads those values from the root `.env`:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: personal-expense-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-expense_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in the root .env file}
      POSTGRES_DB: ${POSTGRES_DB:-expense_manager}
    ports:
      - "5432:5432"
    volumes:
      - expense_postgres_data:/var/lib/postgresql/data

volumes:
  expense_postgres_data:
```

Keep the same password in `backend/.env`'s `DATABASE_URL` so the backend can connect. Never commit either `.env` file.

Start PostgreSQL from the project root:

```bash
docker compose up -d
docker compose ps
```

Stop it (without deleting database data):

```bash
docker compose stop
```

Start it again:

```bash
docker compose start
```

Remove the container but **preserve** its named volume/data:

```bash
docker compose down
```

**Danger:** `docker compose down -v` deletes the database volume/data. Do not use it unless you intentionally want to reset the database.

Optional DBeaver connection:
- Host: `localhost`
- Port: `5432`
- Database: `expense_manager`
- Username: `expense_user`
- Password: the local password you configured

---

## Phase 5 — Set up the Express backend

The Express and TypeScript foundation is already configured. Prisma CLI and Prisma Client are pinned to the same stable version in `backend/package.json`; the PostgreSQL driver adapter is required by this Prisma version.

Configure backend environment variables in `backend/.env` (never commit this file). Use the same database password set in the root `.env`:

```env
DATABASE_URL="postgresql://expense_user:YOUR_LOCAL_PASSWORD@localhost:5432/expense_manager?schema=public"
PORT=4000
```

Create `backend/.env.example` with placeholders, not real secrets.

Use `npm run db:generate` to generate Prisma Client. Use `npm run db:migrate` to create and apply a local development migration. The `build` and `typecheck` scripts generate Prisma Client before running TypeScript checks.

**Do not ask Codex to implement all backend files in one massive pass.** First let it inspect setup and establish a minimal server, then database connection/migration, then modules/features.

### JWT/password configuration

The backend uses Argon2id and JWT. Set `JWT_SECRET` to a unique random value with at least 32 characters in `backend/.env`; `JWT_ACCESS_TOKEN_TTL_SECONDS` defaults to 900 seconds. Keep this file private and use `backend/.env.example` only as a placeholder reference.

---

## Phase 6 — Testing and code quality

Install frontend test tooling in `frontend/`:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Playwright (install only when ready to add browser/E2E tests):

```bash
npm install -D @playwright/test
npx playwright install
```

For linting/formatting, inspect the Vite template's existing ESLint setup first. Avoid installing duplicate configurations. Configure Prettier if not already present.

For backend tests, choose a test runner (Vitest is fine) and add it to `backend/` when needed.

---

## Phase 7 — Install OpenAI's Build Web Apps plugin/skills in Codex

Repository:
https://github.com/openai/plugins/tree/main/plugins/build-web-apps

This is a **Codex plugin package**, not a VS Code extension and not an npm dependency. It contains multiple skills, including frontend-app-builder, frontend-testing-debugging, react-best-practices, and shadcn-best-practices.

### Option A — Codex plugin marketplace (preferred if available in your Codex client)

1. Open Codex in VS Code or its supported Codex UI.
2. Open the plugin browser/marketplace (in clients supporting it, `/plugins`).
3. Add the OpenAI plugin marketplace/repository if it is not already listed.
4. Search for **Build Web Apps**.
5. Install it.
6. Start a new Codex conversation/session if asked or if the skills do not appear.
7. Confirm its skills are visible/available in the plugin details.

If your client does not expose a plugin browser, use Option B.

### Option B — Use the repository's skills directly in your project

Codex supports project skills in `.agents/skills/`, each with a `SKILL.md`. The OpenAI plugin repo packages the Build Web Apps skills in its `plugins/build-web-apps/skills/` directory.

A practical route is to clone/download the repository and copy the skill folders you want into:

```text
personal-expense-manager/
└── .agents/
    └── skills/
        ├── frontend-app-builder/
        │   └── SKILL.md
        ├── frontend-testing-debugging/
        │   └── SKILL.md
        ├── react-best-practices/
        │   └── SKILL.md
        └── shadcn-best-practices/
            └── SKILL.md
```

Use only the skill directories that actually exist in the repository; preserve each skill's complete folder contents and any referenced assets/scripts. Do not copy only the text of `SKILL.md` if the skill references other files.

You can get the source without installing GitHub as a workflow or hosting your project there:
- Download the repository ZIP from GitHub in your browser, or
- Use Git locally to clone the public repository (Git is only a download tool here, not a GitHub development workflow).

After copying skills, restart/reload Codex or open a new session. Ask Codex to list the skills it can see and test invoking one by name.

**Important:** Skills are guidance, not magical automatic behavior. Ask Codex to use the relevant skill for tasks when needed. Stripe and Supabase skills are not central to our selected stack; skip them unless those technologies become relevant.

---

## Phase 8 — Organize project instructions (keep it lean)

Recommended files:

```text
personal-expense-manager/
├── AGENTS.md
├── docs/
│   └── SETUP.md
├── docker-compose.yml
├── frontend/
└── backend/
```

### `AGENTS.md` — instructions Codex should follow

Keep:
- project purpose and approved stack
- architecture and Clean Code/SOLID principles
- constraints (no GitHub, no sprint/backlog work)
- financial correctness and security requirements
- frontend/design rules
- testing expectations
- Codex behavior and Definition of Done

Do not put every terminal command or lengthy tutorial in `AGENTS.md`. It should be durable instructions, not a setup diary.

### `docs/SETUP.md` — setup and runbook

Keep:
- installation prerequisites
- setup commands
- Docker/database startup and shutdown
- environment variable setup
- frontend/backend startup commands
- migrations and troubleshooting

### Other files?

Only add them when they solve a real problem:
- `README.md`: useful for a short project overview and how to run it.
- `.env.example`: required once environment variables exist.
- `docs/ARCHITECTURE.md`: add only if architecture becomes complex enough to need a separate explanation.
- `PLAN.md`, `BACKLOG.md`, `SPRINTS.md`: **do not create**; planning is already done.
- A separate Codex prompt file: unnecessary; `AGENTS.md` is the persistent instruction file.

---

## Phase 9 — Start development with Codex

Once Node.js, Docker, the frontend, and the database are ready:

1. Open the project root in VS Code (not only `frontend/`).
2. Ensure `AGENTS.md` is at the root.
3. Start/verify Docker PostgreSQL.
4. Start the frontend in one terminal.
5. Start the backend in another terminal once it exists.
6. Give Codex one focused task at a time.

Suggested first prompt:

> Read AGENTS.md and inspect the current project. Do not create backlog, sprint, or GitHub artifacts. Verify the frontend and database setup, identify anything missing, and propose the smallest next implementation step. Do not make broad changes without explaining them.

Then implement incrementally.

---

## Quick checklist

- [ ] Node.js LTS installed
- [ ] Docker Desktop installed and running
- [ ] VS Code extensions installed
- [ ] Vite React + TypeScript frontend created
- [ ] Tailwind CSS configured
- [ ] shadcn/ui initialized
- [ ] UI libraries installed
- [ ] PostgreSQL container starts successfully
- [ ] Express + TypeScript backend initialized
- [ ] Prisma configured and database connection verified
- [ ] `.env` is private; `.env.example` contains placeholders
- [ ] AGENTS.md at project root
- [ ] Setup instructions in `docs/SETUP.md`
- [ ] Build/tests/lint verified as configured
- [ ] Codex can see the intended skills
- [ ] Ready to implement application features

**Keep the setup minimal:** install the system prerequisites first, scaffold the app, add dependencies as needed, and let Codex help with the repetitive configuration while you verify each step.
