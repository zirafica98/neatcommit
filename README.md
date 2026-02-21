# NeatCommit – AI Code Review & Security Platform

**NeatCommit** is an AI-powered code review and security auditing platform for GitHub repositories. It integrates as a GitHub App, analyzes pull requests with security-focused rules and optional LLM insights, and delivers inline comments and reports to help teams ship safer code.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [GitHub App Configuration](#github-app-configuration)
- [Supported Languages](#supported-languages)
- [Cost Optimization](#cost-optimization)
- [Deployment](#deployment)
- [Documentation & Links](#documentation--links)
- [License](#license)

---

## Features

- **AI-powered analysis** – GPT-3.5/GPT-4 (configurable, cost-optimized) for complex or critical files.
- **Security focus** – OWASP Top 10, CWE-oriented checks, regex and pattern-based detection.
- **Security scoring & analytics** – Per-repo and per-PR scores and trend views.
- **Automated PR reviews** – Inline comments and summaries on pull requests.
- **Detailed reports** – Issue reports with suggested fixes and references.
- **Multi-language support** – JavaScript, TypeScript, Java, Python, PHP, C#, SQL, Go, Ruby (see [Supported Languages](#supported-languages)).
- **Cost-optimized LLM usage** – LLM only for critical/high-severity or complex files; ~90–95% cost reduction vs full-file analysis.
- **GitHub App integration** – Install per org/repo; webhooks for `pull_request` and `push`.
- **Documentation generation** – Optional AI-generated docs (e.g. README sections) from codebase.
- **Subscription & pricing** – Plans and promo codes; gating of features by plan.
- **Admin & audit** – Admin API and audit logging for key actions.

---

## Tech Stack

### Backend

| Layer        | Technology |
|-------------|------------|
| Runtime     | Node.js 18+ |
| Language    | TypeScript |
| Framework   | Express.js |
| Database    | PostgreSQL 14+ |
| ORM         | Prisma |
| Cache/Queue | Redis 7+, BullMQ |
| Auth        | JWT (access + refresh) |
| Integrations| GitHub App (webhooks, API), OpenAI API |
| Parsing     | Babel (JS/TS AST), regex for other languages |

### Frontend

| Layer     | Technology |
|----------|------------|
| Framework| Angular 17+ (standalone components) |
| UI       | Angular Material |
| State    | RxJS, services |
| Routing  | Angular Router (lazy-loaded features) |

### DevOps / Tooling

- **CI:** GitHub Actions (see `.github/workflows/ci.yml`)
- **Deployment:** See [Deployment](#deployment) and `DEPLOYMENT_GUIDE.md`

---

## Project Structure

```
.
├── backend/                 # Node.js + Express API
│   ├── prisma/              # Schema and migrations
│   └── src/
│       ├── api/routes/      # REST routes (auth, webhooks, subscription, admin, documentation, export, search)
│       ├── config/         # env, database, redis, queue, sentry
│       ├── middleware/     # auth, validation, rate-limit, subscription, admin, cache
│       ├── services/       # business logic (auth, GitHub, analysis, LLM, security, subscription, docs, etc.)
│       ├── workers/        # BullMQ jobs (analysis, documentation)
│       ├── types/          # shared types
│       ├── utils/          # logger, AST, language detection, webhook verification, etc.
│       └── index.ts        # app entry
├── frontend/                # Angular SPA
│   └── src/
│       ├── app/
│       │   ├── core/       # guards, interceptors, layout
│       │   ├── features/  # auth, landing, dashboard, news, etc.
│       │   └── app.routes.ts
│       └── environments/   # environment.ts, environment.prod.ts
├── .github/workflows/       # CI (test, lint, build)
├── DEPLOYMENT_GUIDE.md      # Full deployment instructions
└── README.md                # This file
```

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **Redis** 7+
- **GitHub App** – [Create one](https://github.com/settings/apps) (see [GitHub App Configuration](#github-app-configuration))
- **OpenAI API key** – For LLM-based analysis and optional documentation generation

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/Elementer.git
cd Elementer
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env (see Environment Variables and GitHub App sections)
npx prisma migrate dev
npx prisma generate
npm run dev
```

Backend runs at **http://localhost:3000** (or `PORT` from env).

### 3. Frontend

```bash
cd frontend
npm install
# Edit src/environments/environment.ts: apiUrl, frontendUrl, githubRepoUrl
npm start
```

Frontend runs at **http://localhost:4200**.

### 4. GitHub App

- Configure the app (permissions, webhook URL, secrets) as in [GitHub App Configuration](#github-app-configuration).
- Install the app on a test org/repo and open a PR to trigger analysis.

---

## Environment Variables

Backend uses **`backend/.env`**. Copy from **`backend/.env.example`** and fill in values. Main variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` | Yes (default: localhost) | Redis host |
| `REDIS_PORT` | No (default: 6379) | Redis port |
| `REDIS_PASSWORD` | No | Redis password if needed |
| `JWT_SECRET` | Yes (min 32 chars) | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes (min 32 chars) | Refresh token signing secret |
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key (PEM string) |
| `GITHUB_WEBHOOK_SECRET` | Yes | Webhook secret from GitHub App |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional | OAuth App credentials if using GitHub login |
| `OPENAI_API_KEY` | Yes | OpenAI API key for analysis (and optional docs) |
| `FRONTEND_URL` | No (default: http://localhost:4200) | Frontend origin (CORS, redirects) |
| `API_URL` | No (default: http://localhost:3000) | Public backend URL (e.g. webhook base) |
| `LLM_MODEL` | No (default: gpt-3.5-turbo) | Model for analysis |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |
| `SMTP_*` | No | SMTP settings for email notifications |

Frontend uses **`src/environments/environment.ts`** (dev) and **`environment.prod.ts`** (prod). Set `apiUrl` and `frontendUrl`.

---

## GitHub App Configuration

1. **Create a GitHub App** at [github.com/settings/apps](https://github.com/settings/apps).
2. **Permissions** (Repository):
   - **Contents:** Read-only
   - **Pull requests:** Read & write (for comments)
   - **Metadata:** Read-only
3. **Subscribe to events:** `Pull request`, `Push` (and any others your webhooks use).
4. **Webhook URL:** `https://YOUR_API_DOMAIN/webhook/github` (must be HTTPS in production).
5. **Webhook secret:** Generate and set the same value as `GITHUB_WEBHOOK_SECRET` in `.env`.
6. **Install App:** Install on org or user; allow access to the repos you want to analyze.
7. **Credentials:** Put **App ID** in `GITHUB_APP_ID` and **Private key** (full PEM string) in `GITHUB_PRIVATE_KEY`.

After installation, open a PR on an installed repo to trigger analysis and comments.

---

## Supported Languages

| Language   | Extensions |
|-----------|------------|
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` |
| TypeScript | `.ts`, `.tsx` |
| Java       | `.java` |
| Python     | `.py`, `.pyw`, `.pyi` |
| PHP        | `.php`, `.phtml`, `.php3`–`.php5` |
| C#         | `.cs`, `.csx` |
| SQL        | `.sql` |
| Go         | `.go` |
| Ruby       | `.rb`, `.rbw`, `.rake` |

Details: see `backend/MULTI_LANGUAGE_SUMMARY.md` if present.

---

## Cost Optimization

- LLM is used only for files with **CRITICAL/HIGH** findings or **complex** files (e.g. >400 lines or >8 functions).
- Default model is **gpt-3.5-turbo**; code is truncated (e.g. max 2000 lines) before sending.
- Typical cost: **~$0.1 per PR** vs ~$5–10 with full GPT-4 on all files.

See `backend/COST_OPTIMIZATION.md` for details.

---

## Deployment

- **Backend:** Run migrations with `npx prisma migrate deploy`, set env in your host (Render, Railway, etc.), run `npm run start` or your production command.
- **Frontend:** Build with `npm run build` and serve the `dist/` output (e.g. Vercel, Netlify, or static host).
- **Database:** Use a managed PostgreSQL (e.g. Render, Supabase, Neon).
- **Redis:** Use a managed Redis (e.g. Upstash, Redis Cloud) and set `REDIS_*` in backend env.

**Full step-by-step:** see **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** (database, backend, frontend, env, and optional quick-start docs).

---

## Documentation & Links

- **This README** – Overview, setup, and configuration for developers.
- **In-app docs** – When the frontend is running, **/docs** provides end-user and developer documentation: overview, how it works, tech stack, full API reference, and frontend components.
- **Deployment** – [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).
- **News / roadmap** – In-app **News** page at **/news**.

---

## License

MIT.
