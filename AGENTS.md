# Personal Expense Manager — Project & Codex Instructions

> **Purpose:** This document is the single source of truth for the development of the Personal Expense Manager (Gestionnaire de dépenses personnelles). It defines the approved technology stack, architecture, coding standards, design workflow, and practical instructions for Codex.
>
> **Project status:** Requirements, backlog, and sprint planning have already been completed. The project is currently in the **development phase**. Do not restart or create Agile planning artifacts unless explicitly requested.

---

## 1. Project Context

The application is being developed for an educational-finance association. It allows members to track their monthly income and expenses, organize transactions into categories, understand their budget through simple visualizations, and export summary reports.

### Core capabilities

- Record income and expenses.
- Create and manage transaction categories.
- View, search, filter, and manage transactions.
- Calculate monthly income, expenses, and balance.
- Visualize financial activity with clear charts.
- Manage monthly budgets (where included in the agreed requirements).
- Export summary reports.
- Provide a clean, responsive, understandable user experience.

The existing Android application **Wallet: Budget Expense Tracker by BudgetBakers** may be used as a reference for workflow and product ideas. It is inspiration only: do not copy its branding, proprietary assets, or exact interface. Build an original interface consistent with the approved design.

## 2. Approved Technology Stack

Use this stack unless the project owner explicitly changes it.

### Frontend

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **shadcn/ui** for reusable UI components
- **Lucide React** for icons
- **Recharts** for charts
- **React Hook Form** for form state
- **Zod** for schema validation
- **Sonner** for toast notifications (or the shadcn-supported notification approach already present in the project)

### Backend

- **Node.js**
- **Express**
- **TypeScript**
- REST API

### Database

- **PostgreSQL**
- **Prisma ORM** for schema, migrations, and type-safe data access
- Prefer local PostgreSQL through **Docker** during development, unless the owner chooses a hosted database.

### Quality and tooling

- **Vitest** for unit tests
- **React Testing Library** for frontend component tests
- **Playwright** for end-to-end/browser tests where appropriate
- **ESLint** for linting
- **Prettier** for consistent formatting
- Environment variables for configuration and secrets

Do not introduce additional frameworks, libraries, services, or infrastructure without a clear need and the owner's approval.

## 3. Explicit Project Constraints

These are important:

- **Do not use GitHub** as part of the workflow. Do not create GitHub repositories, issues, pull requests, Actions, or GitHub-specific instructions.
- Git may be used locally if useful, but do not assume remote hosting or a GitHub workflow.
- **Do not create sprints, backlogs, user stories, milestones, or Agile planning documents.** These have already been completed. Work directly on implementation.
- Do not turn this student project into an enterprise-scale platform.
- Do not introduce microservices, Kubernetes, event buses, CQRS, elaborate DDD, or excessive abstraction.
- Favor stable, straightforward, maintainable solutions.
- Do not generate a large amount of code before understanding the existing project structure and the requested feature.
- Preserve existing working code and conventions unless a change is justified.
- Ask the owner when a consequential product or architecture decision is ambiguous. For small implementation details, choose the simplest reasonable option and explain it briefly.

## 4. Architecture and Design Principles

Use a **simple layered architecture** with clear responsibilities. The architecture should make the code understandable and testable without adding layers for their own sake.

### Backend responsibilities

A feature/module may contain:

- **Routes:** map HTTP endpoints to controllers.
- **Controllers:** handle HTTP input/output, status codes, and response shape.
- **Services:** implement business rules and use cases.
- **Repositories:** isolate database access when this abstraction provides value.
- **Validation schemas:** validate and normalize external input.
- **Types:** define domain and application types where useful.

Typical request flow:

`HTTP request → route → validation/middleware → controller → service → repository/Prisma → PostgreSQL`

Controllers must not contain business calculations or substantial database logic. Services should not depend on Express request/response objects. Keep business logic independent from transport details.

### Suggested backend organization

Adapt to the repository's existing structure rather than forcing a refactor:

```text
backend/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── transactions/
│   │   │   ├── transaction.routes.ts
│   │   │   ├── transaction.controller.ts
│   │   │   ├── transaction.service.ts
│   │   │   ├── transaction.repository.ts
│   │   │   ├── transaction.validation.ts
│   │   │   └── transaction.types.ts
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── dashboard/
│   │   └── reports/
│   ├── middleware/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma
└── tests/
```

Not every module needs every file. Avoid empty files, unnecessary interfaces, and abstractions that merely forward calls.

### Suggested frontend organization

```text
frontend/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── shared/           # project-specific reusable components
│   ├── features/
│   │   ├── transactions/
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── dashboard/
│   │   └── reports/
│   ├── layouts/
│   ├── pages/                 # or route-based feature structure
│   ├── lib/
│   ├── hooks/
│   ├── services/               # API client functions
│   ├── types/
│   └── main.tsx
```

Use the structure that best fits the existing codebase. Do not create duplicate organizational patterns.

## 5. Clean Code — Highest Priority

Clean Code is the primary coding priority. Prefer code that is easy to read, reason about, test, and change.

### Required practices

- Use descriptive, intention-revealing names.
- Keep functions focused and reasonably small.
- A function should have one clear responsibility.
- Avoid deeply nested conditionals; use guard clauses where appropriate.
- Avoid duplication; extract shared logic only when the abstraction is meaningful.
- Keep business rules in one appropriate place.
- Avoid magic numbers and unexplained strings; use named constants when helpful.
- Keep components focused; extract reusable UI when it genuinely improves clarity.
- Avoid giant components, controllers, or service files.
- Avoid unnecessary comments. Explain **why** when the code itself cannot make the reason clear; do not narrate obvious code.
- Avoid clever, compressed, or overly generic code.
- Handle errors explicitly and consistently.
- Remove dead code, unused imports, and obsolete commented-out implementations.
- Do not silently swallow errors.
- Avoid `any`; use proper types or `unknown` with safe narrowing.
- Do not use non-null assertions or type casts as shortcuts when proper validation is possible.
- Do not mix formatting or unrelated refactors into a feature unnecessarily.

### SOLID — apply pragmatically

- **SRP:** each module/component/class has one coherent responsibility.
- **OCP:** extend behavior without needlessly modifying unrelated functionality.
- **LSP:** implementations must honor their declared contracts.
- **ISP:** keep interfaces small and specific when interfaces are useful.
- **DIP:** business logic should depend on abstractions when that improves testability or reduces coupling.

Do not create interfaces, abstract classes, factories, dependency-injection frameworks, or design patterns merely to demonstrate SOLID. In TypeScript, simple functions and modules are often sufficient.

### Avoid common design/code smells

Keep an eye out for:

- Rigidity: changes require modifying many unrelated parts.
- Fragility: small changes break unrelated behavior.
- Immobility: useful code cannot be reused without awkward dependencies.
- Viscosity: the clean solution is harder than the quick workaround.
- Needless complexity: abstractions or features without real value.
- Needless repetition: duplicated logic or knowledge.
- Opacity: code whose intent is difficult to understand.

The goal is a straightforward design with **high cohesion, low coupling, and simple dependencies**.

## 6. Financial Data and Correctness

Financial values require special care.

- Use PostgreSQL `DECIMAL`/Prisma `Decimal` for monetary amounts. **Never use floating-point types for persisted money.**
- Define and consistently apply currency handling. Do not assume multi-currency conversion unless it is a requirement.
- Validate amounts, dates, transaction types, and category ownership.
- Distinguish income and expenses clearly. Establish one consistent convention for stored amounts and calculations (for example, positive amount plus an `INCOME`/`EXPENSE` type).
- Ensure monthly calculations use clear date boundaries and a consistent timezone policy.
- Prevent users from accessing or modifying another user's records.
- Use database constraints and foreign keys where appropriate.
- Avoid duplicating derived totals in the database unless there is a justified need.
- Use transactions for multi-step database operations that must succeed or fail together.
- Test calculations, especially month boundaries, empty months, and decimal values.

## 7. Database and Prisma Guidelines

- PostgreSQL is the relational source of truth.
- Model relationships explicitly and use foreign keys.
- Use migrations for schema changes; do not rely on ad-hoc production schema changes.
- Keep Prisma schema readable and consistent.
- Add indexes based on actual query patterns and relationships, not indiscriminately.
- Use Prisma's generated types; avoid duplicating model types unnecessarily.
- Select only the fields required by a response when practical.
- Do not expose raw database records blindly as public API responses.
- Keep database access in the repository/data-access layer or in a clearly justified service-level query when a separate repository would add no value.
- Never commit credentials or `.env` files containing secrets.
- Maintain a safe `.env.example` with placeholder values.

## 8. API and Backend Quality

- Build a clear REST API with predictable resource naming.
- Use appropriate HTTP methods and status codes.
- Validate request bodies, query parameters, and route parameters with Zod or a consistent validation approach.
- Return a consistent error response shape.
- Add centralized error-handling middleware.
- Avoid leaking stack traces, secrets, SQL details, or sensitive data to clients.
- Keep authentication and authorization distinct: a valid login does not imply permission to access every record.
- Enforce ownership checks on every user-owned resource.
- Keep controllers thin and services focused.
- Use pagination for potentially large transaction lists.
- Keep API response types explicit and stable.

Example endpoint conventions (adapt to implemented features):

```http
POST   /api/transactions
GET    /api/transactions
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/dashboard/summary
GET    /api/reports/monthly
```

## 9. Authentication and Security

The approved direction is **custom authentication in Express using JWT**, unless the owner explicitly selects a managed authentication service.

- Hash passwords with a modern password-hashing algorithm (Argon2id or bcrypt with an appropriate work factor).
- Never store plaintext passwords.
- Keep JWT secrets in environment variables.
- Use short-lived access tokens and a considered refresh/session strategy if needed.
- Do not store sensitive tokens insecurely. Prefer secure, HttpOnly cookies when the implementation supports a proper CSRF strategy; otherwise document the chosen approach and its tradeoffs.
- Validate authentication inputs.
- Protect private routes.
- Enforce record ownership in services/repositories.
- Avoid exposing whether a particular account exists unnecessarily.
- Configure CORS narrowly for the frontend origin.
- Use security middleware and sensible request limits where appropriate.
- Never log passwords, tokens, or sensitive financial information.
- Keep security implementation appropriate to the project's scope, but do not compromise basic safety.

## 10. Frontend Implementation Guidelines

### React and TypeScript

- Use functional components and hooks.
- Use TypeScript types for props, API responses, and form data.
- Keep components declarative and readable.
- Avoid unnecessary state; derive values when possible.
- Avoid prop drilling when a small context or feature-level solution is justified, but do not introduce global state libraries by default.
- Use effects only for synchronization with external systems; do not use `useEffect` for calculations that can be derived during render.
- Keep API calls out of large UI components by using feature API/service functions or hooks.
- Handle loading, empty, success, and error states.
- Make forms accessible and provide useful validation messages.
- Avoid premature performance optimization; use memoization only when it solves a demonstrated problem.

### UI components

- Use **shadcn/ui** components for standard UI primitives instead of rebuilding buttons, dialogs, inputs, tables, menus, cards, and similar elements from scratch.
- Customize shadcn components when needed, while preserving accessibility and consistency.
- Keep generated shadcn primitives in the appropriate `components/ui` directory.
- Project-specific compositions belong in shared components or feature components.
- Use **Lucide React** icons consistently.
- Use **Recharts** for dashboard and reporting charts.
- Use responsive layouts and sensible breakpoints.
- Avoid adding another component library alongside shadcn/ui without explicit approval.

### Forms and validation

- Use React Hook Form for forms that benefit from structured form state.
- Use Zod for validation and, where appropriate, infer TypeScript types from schemas.
- Keep validation rules consistent between frontend and backend; backend validation remains authoritative.
- Provide clear field-level feedback and prevent accidental duplicate submissions.

## 11. Google Stitch Design Workflow

Google Stitch is the design tool; **Codex is responsible for integrating, implementing, and maintaining the application**.

### Workflow

1. Use Stitch to design a screen or a coherent set of screens.
2. Establish and preserve a consistent design system: colors, typography, spacing, layout, borders, shadows, and responsive behavior.
3. Treat Stitch output as a design reference or starting point, not as an independent application architecture.
4. Bring the design/code into the existing React project.
5. Reimplement or adapt it using the approved stack, especially shadcn/ui and Tailwind CSS.
6. Extract shared layout and repeated patterns.
7. Verify the implementation against the design at desktop and mobile sizes.
8. Ensure the UI is accessible, functional, and connected to real application state/API behavior.

### Design expectations

- Clean, modern personal-finance dashboard.
- Clear information hierarchy and readable financial figures.
- Consistent spacing and alignment.
- Restrained, purposeful color usage.
- Strong distinction between income, expenses, and balance.
- Charts that are understandable and not decorative.
- Useful empty, loading, error, and success states.
- Responsive sidebar/navigation and tables.
- Accessible contrast, keyboard interaction, and labels.
- Avoid visual clutter and unnecessary animation.

Do not copy Wallet/BudgetBakers branding or assets. Use it only to understand familiar finance workflows.

## 12. Testing and Quality Checks

Tests should protect meaningful behavior, not exist merely to increase coverage.

### Prioritize tests for

- Income/expense calculations.
- Monthly totals and date boundaries.
- Budget calculations.
- Validation rules.
- Authentication and authorization.
- User ownership restrictions.
- CRUD behavior for transactions and categories.
- API error cases.
- Critical user journeys.

### Testing tools

- **Vitest:** unit tests and focused logic tests.
- **React Testing Library:** UI behavior tests.
- **Playwright:** critical end-to-end browser flows.

When implementing a feature:

1. Identify important behavior and edge cases.
2. Add or update focused tests.
3. Run relevant tests.
4. Run lint/type checks where available.
5. Fix regressions before considering the task complete.

Do not claim tests passed unless they were actually executed and their results checked.

## 13. Codex Working Instructions

Codex should behave as a careful engineering assistant, not an autonomous architecture generator.

### Before making changes

1. Inspect the existing files and understand the relevant architecture.
2. Identify existing conventions, dependencies, and implementation.
3. Read relevant documentation or existing code before proposing a new pattern.
4. Determine the smallest change that solves the requested task.
5. Mention important assumptions or risks briefly.

### While implementing

- Make focused, incremental changes.
- Follow this document and the existing project conventions.
- Reuse existing components, utilities, and patterns.
- Do not rewrite unrelated files.
- Do not install dependencies without a clear reason.
- Do not replace the approved stack.
- Do not create GitHub workflows or Agile planning artifacts.
- Do not invent API endpoints, schema fields, or product requirements without checking the code/specification.
- Keep the solution simple and maintainable.
- Add tests for important behavior.
- Preserve accessibility and responsive design.
- Never hardcode credentials, secrets, or environment-specific values.
- If a requirement conflicts with the existing implementation or this document, explain the conflict and ask when the decision is consequential.

### After implementing

Report concisely:

- What changed.
- Which files were affected.
- Any migration or setup steps required.
- Tests/checks actually run and their results.
- Any known limitation or follow-up needed.

Do not provide long generic explanations or claim completion without verifying the work.

### Codex response style

Be concise, practical, and direct. Prefer implementation over lengthy commentary when the task is clear. Explain meaningful decisions, not every line of code.

## 14. Definition of Done for a Development Task

A task is complete when applicable:

- The requested behavior is implemented.
- Code follows the architecture and Clean Code principles in this document.
- Input validation and error handling are addressed.
- Authorization/ownership checks are included for protected data.
- UI includes loading, empty, and error states where relevant.
- Responsive/accessibility concerns are considered.
- Important behavior has tests.
- TypeScript/lint checks pass, or existing failures are clearly reported.
- No unrelated regressions or unnecessary dependencies were introduced.
- Setup/migration instructions are documented if needed.
- Codex reports what it verified truthfully.

## 15. Quick Reference — Non-negotiable Defaults

| Area | Decision |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Express + JWT (custom) |
| Local DB | PostgreSQL via Docker |
| Unit tests | Vitest |
| UI tests | React Testing Library |
| E2E tests | Playwright, where useful |
| Design | Google Stitch |
| Coding agent | Codex in VS Code |
| Code priority | Clean Code, pragmatic SOLID |
| GitHub | **Not part of this project workflow** |
| Agile planning | **Already completed; do not recreate** |
| Architecture | Simple layered architecture; no overengineering |

---

## 16. Final Instruction to Codex

**Treat this file as the project's engineering constitution.**

Build the Personal Expense Manager with the approved stack and a clean, original, Stitch-informed UI. Keep the implementation stable, understandable, testable, and appropriately scoped. Apply Clean Code and SOLID pragmatically. Do not overengineer. Do not use GitHub. Do not restart Agile planning. Work directly on the current development task, inspect the existing code first, make focused changes, verify them, and report results honestly.

When in doubt, choose the simplest maintainable solution that satisfies the actual requirements—or ask the project owner if the decision materially affects architecture, security, or product behavior.
