# Personal Expense Manager
## Software Engineering Quality Audit

**Project:** Personal Expense Manager (Gestionnaire de dépenses personnelles)  
**Audit date:** 13 November 2026  
**Deliverable:** Evidence-based repository audit for academic review  
**Scope:** Source code, configuration, database schema and migrations, setup documentation, and available tests

---

## Executive Summary

The inspected repository contains a functioning full-stack foundation: a React and TypeScript client, an Express REST API, PostgreSQL persistence through Prisma, custom JWT authentication, transaction and category endpoints, and a monthly dashboard. The implementation demonstrates sound engineering choices, particularly decimal-safe money handling, Zod validation at API boundaries, explicit user scoping, centralized API error handling, and focused backend tests for important validation and ownership cases.

The design is **partially compliant with the stated engineering standards**. Its backend is divided into route, controller, validation, and service modules. Its frontend is organized by feature and uses reusable interface primitives. The strongest limitations are incomplete product coverage against the project description, concentrated frontend responsibilities, and limited architectural seams between business logic and Prisma. A specific data-integrity risk exists in category updates: changing a category from income to expense (or vice versa) changes the classification used for every attached transaction, including historical records ([`categories.service.ts`](../backend/src/modules/categories/categories.service.ts#L45)).

This audit does not conclude that the team follows Agile practices. A repository cannot establish customer collaboration, delivery cadence, team interactions, or retrospectives. The design-quality measures, design symptoms, and SOLID/pattern discussion have been checked against the five-page course handout *Résumé de cours.pdf*. The course's question-based definitions are used below; repository-specific assessments remain evidence-based and distinguish observed issues from risks or unavailable process evidence.

**Overall assessment:** a credible, reasonably structured development-stage application with good foundations in validation, ownership, and monetary correctness; incomplete feature coverage and several medium-priority design and security follow-ups remain. This is a qualitative judgement based on the inspected repository, not a numerical score or a claim of runtime verification.

## 1. Project Architecture and Technologies

The repository uses React, TypeScript, Vite, Tailwind CSS, shadcn-compatible UI primitives, Lucide, Recharts, React Hook Form, and Zod in the frontend package ([`frontend/package.json`](../frontend/package.json#L12)). The backend uses Node.js, Express, TypeScript, PostgreSQL, Prisma, Argon2id, JWT, and Zod ([`backend/package.json`](../backend/package.json#L19)). Docker Compose defines a PostgreSQL 17 development service ([`docker-compose.yml`](../docker-compose.yml#L1)).

The API request flow is expressed as routers applying authentication and Zod middleware, then invoking controllers that call feature services. Express mounts authentication, category, transaction, and dashboard routers in [`backend/src/app.ts`](../backend/src/app.ts#L12). Feature services query Prisma directly. The frontend is organized into authentication, transactions, dashboard, profile, and about features; reusable UI primitives are under `frontend/src/components/ui/`.

The Prisma schema models users, categories, and transactions. Money is persisted as `Decimal(12,2)`, transaction ownership and category ownership are explicit, and indexes support user/date and category/user access ([`schema.prisma`](../backend/prisma/schema.prisma#L23)). The inspected API surface includes registration/login/profile/avatar, category CRUD, transaction CRUD/listing, dashboard summary, and health checks. No budget or report/export routes or corresponding frontend feature modules appear in the inspected source tree ([`backend/src/app.ts`](../backend/src/app.ts#L12), [`frontend/src/features/`](../frontend/src/features/)).

Setup instructions are in root-level `SETUP.md`; the frontend README remains the uncustomized Vite template. Setup documentation describes a Vite development proxy to the API and instructs use of environment files ([`SETUP.md`](../SETUP.md#L1), [`vite.config.ts`](../frontend/vite.config.ts#L13)).

## 2. Audit Methodology and Evaluation Criteria

The audit inspected repository instructions and setup documentation, package manifests, source modules, Prisma schema and migrations, frontend components and API clients, and backend test source. Findings are tied to file paths and line numbers so they can be checked against the current checkout. Line references point to the inspected files as of the audit date.

Each finding uses one of four classifications:

- **Compliant:** direct evidence supports the criterion in the inspected scope.
- **Partially compliant:** meaningful evidence exists, with identifiable limitations.
- **Non-compliant:** a concrete implementation gap or violation is visible.
- **Not assessable:** the repository does not provide enough evidence.

Repository evidence can establish implementation structure and test cases; it cannot establish that the current database is migrated, that tests pass, that the deployed application behaves correctly, or that a team consistently follows a process. Tests and builds were not run as part of this documentation-only audit. The five-page course handout *Résumé de cours.pdf* was reviewed, including its diagrams. Sections 5–8 use its terminology and diagnostic framing. Repository evidence remains distinct from course definitions.

## 3. Clean Code Assessment

| Criterion | Status | Evidence and practical effect |
|---|---|---|
| Naming and readability | **Partially compliant** | Names such as `buildTransactionWhere`, `getDashboardSummary`, and `toTransactionResponse` communicate intent ([`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L44), [`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L168)). The transaction page combines filtering, form behavior, persistence orchestration, and page rendering in a 552-line feature component; this makes changes require reading a broad module ([`transactions-page.tsx`](../frontend/src/features/transactions/transactions-page.tsx#L1)). |
| Focused responsibilities | **Partially compliant** | Backend routes, controllers, validation, and services are separated. The transaction page contains subcomponents such as `CategoryMenu`, `DateRangeFilter`, and `TransactionForm`, but still owns multiple page-level concerns ([`transactions-page.tsx`](../frontend/src/features/transactions/transactions-page.tsx#L81)). |
| Error handling | **Partially compliant** | A central Express error handler returns a stable response shape and suppresses internal details ([`error-handler.ts`](../backend/src/middleware/error-handler.ts#L16)). Feature API clients separately parse responses and errors, so conventions can drift ([`auth-api.ts`](../frontend/src/features/auth/auth-api.ts#L49), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L67), [`dashboard-api.ts`](../frontend/src/features/dashboard/dashboard-api.ts#L48)). |
| Financial correctness | **Compliant in inspected paths** | Amounts are decimal strings at API boundaries, converted to Prisma Decimal, persisted as `DECIMAL(12,2)`, and constrained to positive values; totals use Decimal operations ([`transactions.validation.ts`](../backend/src/modules/transactions/transactions.validation.ts#L5), [`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L34), [`migration.sql`](../backend/prisma/migrations/20261109000000_init/migration.sql#L43), [`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L241)). |
| Input validation | **Compliant in inspected API routes** | Zod schemas validate bodies, parameters, and queries before controllers run; strict schemas reject unexpected fields ([`validate-request.ts`](../backend/src/middleware/validate-request.ts#L20), [`transactions.validation.ts`](../backend/src/modules/transactions/transactions.validation.ts#L26)). |
| Separation of concerns | **Partially compliant** | HTTP handling is kept out of feature services. Services directly import the shared Prisma client, coupling use-case logic to persistence and making substitution or isolated service tests harder ([`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L1), [`prisma.ts`](../backend/src/lib/prisma.ts#L1)). |
| Duplication and conventions | **Partially compliant** | Feature-specific code is grouped consistently, but fetch, response parsing, and error handling are repeated in separate frontend clients. Shared API behavior is consequently implemented in three places ([`auth-api.ts`](../frontend/src/features/auth/auth-api.ts#L49), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L67), [`dashboard-api.ts`](../frontend/src/features/dashboard/dashboard-api.ts#L48)). |
| Maintainability and testability | **Partially compliant** | Backend test source covers authentication, ownership, validation, and financial aggregation. The Prisma client is mocked, so tests verify API behavior without proving PostgreSQL constraint or migration behavior. No frontend test files were found in the inspected tree ([`api.test.ts`](../backend/tests/api.test.ts#L159)). |

## 4. Agile Manifesto Assessment

The values and principles below are assessed as **development-practice claims**, not as a checklist that can be proven by application architecture. A source tree can show working software and quality artifacts, but it cannot show the social and temporal practices described by the Manifesto. `AGENTS.md` states that planning has already been completed and the project is in development; this is project guidance, not evidence of how the team actually worked ([`AGENTS.md`](../AGENTS.md#L1)).

### 4.1 Four values

| Agile value | Repository evidence | Status |
|---|---|---|
| Individuals and interactions over processes and tools | No meeting records, team agreements, or collaboration history are present in the inspected repository. | **Not assessable** |
| Working software over comprehensive documentation | Source code and API tests exist, but the repository cannot establish delivery cadence or how the team balanced software with documentation. | **Not assessable** |
| Customer collaboration over contract negotiation | No customer feedback, review notes, or change decisions are available. | **Not assessable** |
| Responding to change over following a plan | No dated backlog history, release history, or evidence of response to changing requirements is available. | **Not assessable** |

### 4.2 Twelve principles

| Principle (concise paraphrase) | What the repository can show | Status |
|---|---|---|
| 1. Satisfy customers through early and continuous delivery | A source implementation exists; no delivery dates, release history, or customer acceptance evidence is present. | **Not assessable** |
| 2. Welcome changing requirements | No requirement-change history or team response is recorded. | **Not assessable** |
| 3. Deliver working software frequently | The code and test source do not establish delivery frequency. | **Not assessable** |
| 4. Business people and developers collaborate daily | No collaboration or communication evidence is available. | **Not assessable** |
| 5. Build around motivated individuals and provide support | Team composition, autonomy, and working conditions cannot be derived from source code. | **Not assessable** |
| 6. Prefer direct conversation | No communication evidence is present. | **Not assessable** |
| 7. Use working software as the primary progress measure | The repository contains application code, but no progress measures or stakeholder review records. | **Not assessable** |
| 8. Maintain a sustainable pace | No work schedule or pace evidence is available. | **Not assessable** |
| 9. Maintain technical excellence and good design | Decimal-safe money handling, boundary validation, ownership-scoped queries, and focused backend tests are visible. Frontend tests are absent from the inspected tree and tests were not run. | **Partially compliant (implementation evidence only)** |
| 10. Maximize simplicity | The layered API and feature-oriented folders are straightforward. Some client/page responsibilities and duplicated request mechanics could be simpler. | **Partially compliant (code evidence only)** |
| 11. Let self-organizing teams produce good designs | Team organization and decision-making cannot be assessed from source. | **Not assessable** |
| 12. Reflect regularly and adjust | No retrospective or improvement history is available. | **Not assessable** |

The repository supports a limited assessment of technical implementation, not an overall claim of Agile compliance. Evaluating the other claims would require project history, stakeholder feedback, release records, and team-practice evidence.

## 5. Five Design-Quality Measures

The course (page 3) frames design quality with two questions: **Does the design answer today's need?** and **Will it remain reliable and adaptable?** It then uses five measures as diagnostic questions. The assessment below follows those definitions rather than treating the measures as abstract scores.

| Measure | Course framing / diagnostic question | Project evidence and assessment |
|---|---|---|
| **Cohésion (Cohesion)** | *Le travail reste ensemble — Organisation.* **À quel point un composant est-il focalisé ?** A component should have a clear objective; more distinct reasons to change indicate weaker cohesion. | **Partially compliant.** Feature folders group related API, page, and presentation code; backend transaction operations are grouped together ([`transactions.routes.ts`](../backend/src/modules/transactions/transactions.routes.ts#L11)). The transaction page still owns several separable UI tasks, giving it multiple reasons to change. |
| **Couplage (Coupling)** | *Limiter les dépendances inutiles — Organisation · Évolution.* **Jusqu'où un changement se propage-t-il ?** Low coupling means little knowledge of another component's internals; changing storage should not require rewriting screens. | **Partially compliant.** Routes depend on controllers and services, but services import the singleton Prisma client directly. Frontend API clients separately depend on browser `fetch`, token storage, and response parsing ([`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L1), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L67)). These are concrete dependency points; a persistence seam is only warranted if it reduces real change or testing cost. |
| **Suffisance (Sufficiency)** | *Assez pour répondre au besoin — Besoin actuel.* **Le design satisfait-il le comportement requis ?** The course's example emphasizes having enough behavior, but not more than needed. | **Partially compliant / scope-dependent.** Authentication, categories, transactions, and dashboard flows exist. Report/export and budget capabilities are not visible in the inspected source. Their absence is a gap only if they are part of the approved current requirement; confirm scope before treating them as defects. |
| **Complétude (Completeness)** | *Honorer tout le contrat — Besoin actuel.* **Tous les cas promis sont-ils couverts ?** Identify the contract, its limits, and the cases; for example, success, refusal, and boundary cases. | **Partially compliant.** Validation, ownership, pagination, empty dashboard states, and backend test cases are visible. No report/export, budget endpoints, frontend tests, or category-management page were found. The last items should be evaluated against agreed requirements, not assumed promises. |
| **Primitivité (Primitiveness)** | *Des briques de base utiles — Complexité.* **Chaque opération est-elle focalisée et simple ?** The course contrasts one focused operation with a top-level operation that assumes too many roles; reuse should not require an unnecessary wrapper. | **Partially compliant.** Named helpers and explicit schemas keep many rules understandable. Dashboard aggregation/bucketing/formatting and the transaction page contain multiple responsibilities ([`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L37), [`transactions-page.tsx`](../frontend/src/features/transactions/transactions-page.tsx#L184)). Extract only where it creates a focused, reusable operation—not merely to add layers. |

These measures are **diagnostic questions, not numeric grades**. A finding should identify the behavior or change that demonstrates the issue and a proportionate remedy.

## 6. Seven Symptoms of a Suffering Design

Page 4 of the course defines a symptom as **evidence of pain caused by change, not a verdict on people**. The prescribed approach is to observe, detect, explain impact, and remedy the specific cause. The table uses the course's definitions.

| Symptom | Course definition | Project assessment, impact, and targeted remedy |
|---|---|---|
| **1. Rigidité (Rigidity)** | *Un petit changement force des modifications partout.* | **Partially present / limited.** Adding a transaction sort option crosses API validation, backend ordering, frontend types, and UI controls ([`transactions.validation.ts`](../backend/src/modules/transactions/transactions.validation.ts#L59), [`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L76), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L35)). These are related contract touchpoints, not proof of excessive rigidity. Keep the contract explicit and test the boundaries; avoid a strategy framework unless policies grow. |
| **2. Fragilité (Fragility)** | *Une modification locale casse autre chose.* | **Demonstrated risk.** `updateCategory` permits changing category type without checking linked transactions ([`categories.service.ts`](../backend/src/modules/categories/categories.service.ts#L45)); dashboard totals derive classification from the current category type ([`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L246)). A local category edit can therefore reclassify historical transactions and alter past totals. Reject type changes for used categories or implement explicit atomic reclassification. |
| **3. Immobilité (Immobility)** | *Une partie utile ne peut pas bouger seule.* | **Potential, not demonstrated as an actual reuse failure.** Services use a singleton Prisma client, and frontend API code is coupled to browser globals and token storage ([`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L1), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L67)). This can hinder alternate-runtime reuse or isolated tests. Introduce a seam only when a concrete reuse/test need exists. |
| **4. Viscosité (Viscosity)** | *Le chemin propre coûte plus que le raccourci.* | **Not demonstrated / uncertain.** Source code cannot establish that developers find a shortcut easier than the clean solution. The broad transaction page and repeated API plumbing may increase change friction, but that is a hypothesis. Observe actual change workflows before redesigning. |
| **5. Complexité inutile (Needless Complexity)** | *De la structure pour des besoins qui n'existent pas.* | **Not identified in inspected backend; UI assessment limited.** The backend uses ordinary Express/Prisma modules without an elaborate framework. Dashboard date and chart assembly supports visible monthly and cash-flow views ([`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L77)). No principle or pattern should be added without an actual need. |
| **6. Répétition inutile (Needless Repetition)** | *Un même fait, plusieurs copies qui divergent.* | **Present.** Authentication, transaction, and dashboard API modules each implement request/response handling ([`auth-api.ts`](../frontend/src/features/auth/auth-api.ts#L49), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L67), [`dashboard-api.ts`](../frontend/src/features/dashboard/dashboard-api.ts#L48)). Their common transport/error behavior can diverge. Extract a small shared request function while retaining feature-specific schemas. |
| **7. Opacité (Opacity)** | *On ne voit pas l'intention d'une décision.* | **Partially present.** Backend names and narrow route modules are generally explicit. The transaction page's length and responsibilities make form, filter, and mutation flow harder to read as one unit ([`transactions-page.tsx`](../frontend/src/features/transactions/transactions-page.tsx#L184)). Split the most independent responsibilities and retain descriptive naming. |

The course also warns against applying a remedy by default: diagnose the concrete change pain first, then select the remedy associated with that symptom.

## 7. SOLID Assessment

Page 5 describes SOLID as targeted remedies for observed design problems, not a checklist requiring every abstraction to be installed. The assessment follows those meanings.

| Principle | Course framing | Concrete assessment |
|---|---|---|
| **Single Responsibility Principle (SRP)** | **Une seule raison de changer.** One class/module should have one axis of change. | **Partially compliant.** Backend routing, HTTP handling, validation, and use cases are separated. The transaction UI page combines filters, editing, deletion, and refresh orchestration, creating several reasons to change ([`transactions.routes.ts`](../backend/src/modules/transactions/transactions.routes.ts#L11), [`transactions-page.tsx`](../frontend/src/features/transactions/transactions-page.tsx#L184)). Extract only a genuinely independent responsibility. |
| **Open/Closed Principle (OCP)** | **Ouvert à l'extension, fermé à la modification.** Add a rule without rewriting stable existing behavior. | **Partially compliant.** Feature boundaries and validation helpers localize behavior, but adding sort modes edits switches and validation/type definitions ([`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L76), [`transactions.validation.ts`](../backend/src/modules/transactions/transactions.validation.ts#L59)). This is proportionate at current scale; extension points are justified only if variation becomes frequent. |
| **Liskov Substitution Principle (LSP)** | **Un sous-type tient toutes les promesses du type.** A subtype must preserve the behavioral contract of its parent type. | **Not assessable / not applicable to inspected design.** No meaningful hierarchy of interchangeable domain subtypes or implementations appears in the source; the project favors functions and React components. No LSP violation is demonstrated. |
| **Interface Segregation Principle (ISP)** | **Les appelants ne dépendent que de ce qu'ils utilisent.** Keep interfaces small and client-specific. | **Partially compliant / limited evidence.** Feature functions accept focused typed inputs and no broad client interface forces unrelated capabilities on consumers. The project has few explicit service interfaces, so formal interface segregation is not extensively testable ([`transactions.validation.ts`](../backend/src/modules/transactions/transactions.validation.ts#L26)). |
| **Dependency Inversion Principle (DIP)** | **Dépendre d'abstractions, pas de détails.** High-level policy should not depend directly on low-level persistence details. | **Partially compliant.** Controllers depend on service functions, separating HTTP details. Business services import the concrete shared Prisma client, so persistence is not behind a port ([`transactions.controller.ts`](../backend/src/modules/transactions/transactions.controller.ts#L1), [`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L1)). This is a manageable trade-off, but limits substitution and service isolation. |

## 8. Design Patterns and Architectural Principles

Page 5 presents patterns as **compromises applied to a real design pain**, not an inventory to implement by default. The three patterns below are assessed using the course's stated purpose.

| Pattern | Course framing | Assessment |
|---|---|---|
| **Strategy** | *Interchanger un algorithme quand les règles varient réellement.* | **Not materially implemented.** Transaction sorting uses a switch selecting Prisma order clauses ([`transactions.service.ts`](../backend/src/modules/transactions/transactions.service.ts#L76)). This is a small finite choice, not separate interchangeable algorithms. Strategy would currently add indirection; consider it only if sort/pricing/etc. rules vary independently. |
| **Repository** | *Cacher la persistance derrière un contrat de données clair.* | **Not implemented explicitly.** Feature services call Prisma directly. The code remains understandable, but use-case logic and persistence are coupled. A repository could support DIP, reduce coupling, and facilitate tests if a concrete need arises; it is not mandatory merely for pattern compliance. |
| **Observer** | *Notifier après une commande enregistrée — si besoin.* | **Lightweight event-based use is present.** Transaction changes dispatch a browser event, and the dashboard listens to refresh data ([`app-events.ts`](../frontend/src/lib/app-events.ts#L1), [`dashboard-page.tsx`](../frontend/src/features/dashboard/dashboard-page.tsx#L168)). Auth invalidation uses a similar event. This is a small observer/pub-sub mechanism in one browser window, not a general event system. |

**Related principles in the course:** modularity is visible in backend feature modules and frontend feature folders; encapsulation is supported by request schemas, response mapping, and safe user selects that omit password hashes ([`auth.service.ts`](../backend/src/modules/auth/auth.service.ts#L9)). The architecture is predominantly functional/module-based. Class-heavy design is not needed, and classes should not be added solely to demonstrate OOP.

## 9. Strengths Supported by Code Evidence

- **Money is represented safely.** Database amounts use `DECIMAL(12,2)`, API input is validated as a positive decimal string, and summary calculations use Prisma Decimal ([`schema.prisma`](../backend/prisma/schema.prisma#L46), [`transactions.validation.ts`](../backend/src/modules/transactions/transactions.validation.ts#L5), [`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L250)).
- **Ownership checks are explicit.** Private routers apply authentication, and transaction/category queries include the authenticated user ID. The compound category/owner foreign key prevents attaching another user's category to a transaction ([`transactions.routes.ts`](../backend/src/modules/transactions/transactions.routes.ts#L13), [`categories.service.ts`](../backend/src/modules/categories/categories.service.ts#L13), [`schema.prisma`](../backend/prisma/schema.prisma#L51)).
- **Authentication uses a password hash and constrained JWT settings.** Argon2id is used for password hashing; JWT configuration requires a secret of at least 32 characters and bounds token lifetime ([`auth.service.ts`](../backend/src/modules/auth/auth.service.ts#L28), [`auth.ts`](../backend/src/config/auth.ts#L4)).
- **Validation is deliberate.** Request body, route parameter, and query validation share middleware and produce a structured error shape ([`validate-request.ts`](../backend/src/middleware/validate-request.ts#L8)).
- **Dashboard periods use explicit UTC boundaries.** Queries use inclusive start and exclusive end timestamps; monthly and weekly series fill empty buckets ([`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L168), [`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L92)).
- **Backend tests target meaningful risk areas.** Test source covers password hashing, category ownership, transaction validation, pagination, exact decimal summaries, empty months, and user-scoped dashboard results ([`api.test.ts`](../backend/tests/api.test.ts#L159), [`api.test.ts`](../backend/tests/api.test.ts#L728), [`api.test.ts`](../backend/tests/api.test.ts#L966)).
- **The UI provides loading and failure states for dashboard data.** Loading skeletons, retry behavior, and an explicit error view are present ([`dashboard-page.tsx`](../frontend/src/features/dashboard/dashboard-page.tsx#L75), [`dashboard-page.tsx`](../frontend/src/features/dashboard/dashboard-page.tsx#L103)).

## 10. Weaknesses and Technical Debt Identified

1. **Historical category classification can change.** Category updates allow changing the type without guarding existing transactions. Dashboard aggregation reads the current category type, so a type edit changes how past amounts contribute to income and expenses. This risks misleading balances and reports ([`categories.service.ts`](../backend/src/modules/categories/categories.service.ts#L45), [`dashboard.service.ts`](../backend/src/modules/dashboard/dashboard.service.ts#L246)).
2. **Feature coverage is incomplete relative to the repository's project description.** No budget or report/export module is present; the frontend has no category-management page despite backend category CRUD. Whether each item is required depends on the approved requirements, which were not supplied as a separate specification ([`AGENTS.md`](../AGENTS.md#L11), [`backend/src/app.ts`](../backend/src/app.ts#L12), [`frontend/src/features/`](../frontend/src/features/)).
3. **Frontend responsibilities and API plumbing are repeated.** The transaction page is broad, and three API modules implement their own transport handling. This raises change cost and can cause inconsistent handling of auth expiry or malformed responses ([`transactions-page.tsx`](../frontend/src/features/transactions/transactions-page.tsx#L184), [`auth-api.ts`](../frontend/src/features/auth/auth-api.ts#L49), [`transactions-api.ts`](../frontend/src/features/transactions/transactions-api.ts#L67)).
4. **Frontend automated test coverage is not visible.** Backend tests are present, but the inspected frontend tree contains no test/spec files. UI regressions in forms, error states, and accessibility are consequently not protected by checked-in tests.
5. **Authentication tokens are stored in session storage.** The browser stores a bearer token in `sessionStorage` ([`auth-session.ts`](../frontend/src/features/auth/auth-session.ts#L1)); page scripts can access it. No refresh or server-side revocation route appears in the inspected API, while client sign-out only clears local storage. The choice and trade-offs are not documented in the setup guide. This merits explicit review before deployment.
6. **Production cross-origin behavior is unspecified.** Express does not register CORS middleware in the application setup, although `cors` is a backend dependency. A Vite proxy handles local development, so production deployment topology has not been established ([`app.ts`](../backend/src/app.ts#L8), [`vite.config.ts`](../frontend/vite.config.ts#L13)).
7. **Some operational/security safeguards are not visible.** No authentication rate limiting is wired into routes, and `express.json()` is used without an application-specific size limit ([`app.ts`](../backend/src/app.ts#L10), [`auth.routes.ts`](../backend/src/modules/auth/auth.routes.ts#L8)). These may matter if the API is exposed beyond local development.

## 11. Prioritized Improvement Recommendations

| Priority | Recommendation | Rationale |
|---|---|---|
| **High** | Prevent silent category type changes when transactions reference the category, or provide an explicit, atomic reclassification workflow. | Preserves historical income/expense meaning and accurate monthly balances. |
| **High** | Confirm the approved product scope and implement the agreed report/export and budget journeys; add category management UI if members are expected to manage categories directly. | Closes the gap between the project description and implementation without inventing requirements. |
| **High before public deployment** | Decide and document token storage, logout/revocation, refresh behavior, and deployment origin policy. Add CORS with a narrow allowlist only if cross-origin hosting is intended. | Makes the authentication session and browser/API boundary deliberate. |
| **Medium** | Create a small shared frontend request helper for consistent token, error, and response handling; retain feature-specific Zod schemas. | Reduces repeated plumbing without adding a large client framework. |
| **Medium** | Add focused frontend tests for transaction form validation/submission, auth session restoration, dashboard loading/error/empty states, and profile changes. | Protects important UI behavior currently covered only by backend test source. |
| **Medium** | Add a guard and test for category type updates with attached transactions. Consider database-backed integration checks for migrations and composite ownership constraints. | Current tests mock Prisma and cannot prove database-level behavior. |
| **Medium before public deployment** | Apply request-size limits and rate limits to registration/login; define CORS or a same-origin reverse proxy for the target deployment. | Limits resource abuse and resolves environment-specific browser access. |
| **Low / as needed** | Split the transaction page along stable responsibilities and consider a repository seam if direct Prisma access materially impedes testing or change. | Improves readability without premature abstraction. |
| **For Agile assessment** | Retain actual stakeholder feedback, delivery/release evidence, and retrospective outcomes if an academic claim about Agile practice is required. | These practices cannot be established from source code or package configuration. |

## 12. Conclusion

The Personal Expense Manager has a solid implementation base for its current development stage. The clearest evidence of engineering care is exact monetary representation, user ownership enforcement, boundary validation, predictable API error responses, and backend tests focused on important business rules. The layered backend and feature-based frontend are understandable without enterprise-scale architecture.

The strongest correctness issue is mutable category classification: a category type change can reinterpret historical transactions and alter dashboard totals. Feature completeness remains uncertain until the approved scope is compared with visible implementation; budget and export/report functionality are absent from the inspected routes and feature modules. Frontend request handling and transaction-page responsibilities are the clearest maintainability opportunities.

The repository alone does not justify a claim that the team is Agile, and the course framework has been applied to the design-quality measures, symptoms, SOLID principles, and patterns. Subject to those limits, the appropriate conclusion is **partially compliant with the project's stated software-engineering direction**, with targeted improvements recommended rather than a broad redesign.

## 13. Limitations of the Audit

- The course reference is the five-page `Résumé de cours.pdf` supplied for this audit. Its visual summaries on pages 3–5 informed Sections 5–8. Repository-specific examples and statuses remain the auditor's evidence-based interpretations, not claims stated by the course.
- No project requirement specification beyond repository instructions and setup notes was available. Absence of a feature in source is reported as a gap against the project description, not proof that it is in scope now.
- Agile values and most principles require evidence outside the repository, including team communication, stakeholder feedback, releases, and retrospective records. They are marked not assessable where appropriate.
- Tests, type checks, lint, database migrations, and browser behavior were not executed. Coverage statements describe checked-in test source only and do not imply that tests pass.
- The audit covers visible source and configuration. It does not review private environment contents, production configuration, a live database, deployment settings, or runtime security posture.
- File references and line numbers point to the inspected checkout on 13 November 2026; they may shift as the code changes.
