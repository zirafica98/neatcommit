# AI Code Review Platform - Development Plan

## Projektna Struktura

```
elementer/
├── backend/                 # Node.js + TypeScript backend
│   ├── src/
│   │   ├── api/           # API routes
│   │   ├── services/      # Business logic
│   │   ├── workers/       # Queue workers
│   │   ├── models/        # Data models
│   │   ├── utils/         # Utilities
│   │   └── config/        # Configuration
│   ├── prisma/            # Database schema & migrations
│   └── package.json
├── frontend/              # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/      # Core services, guards, interceptors
│   │   │   ├── features/ # Feature modules
│   │   │   │   ├── dashboard/
│   │   │   │   ├── repositories/
│   │   │   │   ├── reviews/
│   │   │   │   └── settings/
│   │   │   ├── shared/   # Shared components
│   │   │   └── layout/   # Layout components
│   │   └── assets/
│   └── package.json
├── shared/                # Shared types/interfaces
└── README.md
```

## Faza 1: Projekt Setup i Infrastruktura

### 1.1 Backend Setup

- Inicijalizacija Node.js projekta sa TypeScript
- Setup Express server sa middleware (CORS, body-parser, error handling)
- Environment variables konfiguracija (.env files)
- ESLint i Prettier konfiguracija
- Package.json sa svim dependencies

**Fajlovi:**

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.eslintrc.json`
- `backend/src/index.ts` - Main server entry point
- `backend/src/config/env.ts` - Environment configuration

### 1.2 Database Setup

- PostgreSQL schema design (Prisma ORM)
- Redis konfiguracija za caching i queue
- Database migrations setup
- Seed data za development

**Fajlovi:**

- `backend/prisma/schema.prisma` - Database schema
- `backend/src/config/database.ts` - Database connection
- `backend/src/config/redis.ts` - Redis connection

**Database Models:**

- User (GitHub users)
- Repository (connected repos)
- Installation (GitHub App installations)
- Review (code review results)
- Issue (individual issues found)
- ReviewComment (comments posted to PRs)

### 1.3 Frontend Setup

- Angular CLI projekat sa routing
- Angular Material za UI komponente
- HTTP interceptor za API calls
- Auth guard za protected routes
- Environment configuration

**Fajlovi:**

- `frontend/angular.json`
- `frontend/tsconfig.json`
- `frontend/src/environments/environment.ts`
- `frontend/src/app/core/` - Core services

## Faza 2: Authentication i GitHub Integracija

### 2.1 GitHub OAuth

- GitHub OAuth flow za user login
- JWT token generation i validation
- User session management
- Refresh token mechanism

**Fajlovi:**

- `backend/src/api/routes/auth.ts` - Auth endpoints
- `backend/src/services/auth.service.ts` - Auth logic
- `frontend/src/app/core/services/auth.service.ts`
- `frontend/src/app/core/guards/auth.guard.ts`

### 2.2 GitHub App Setup

- GitHub App creation i konfiguracija
- Webhook endpoint za GitHub events
- Installation management (install/uninstall)
- Repository selection i permissions

**Fajlovi:**

- `backend/src/api/routes/webhooks.ts` - Webhook handler
- `backend/src/services/github.service.ts` - GitHub API client
- `backend/src/services/github-app.service.ts` - App management
- `frontend/src/app/features/repositories/components/install-app.component.ts`

**GitHub App Permissions:**

- Repository contents: Read
- Pull requests: Read & Write
- Metadata: Read

## Faza 3: Core Analysis Engine

### 3.1 Code Parsing

- AST parser za JavaScript/TypeScript (Babel)
- File diff parsing (GitHub API)
- Language detection
- Code context extraction

**Fajlovi:**

- `backend/src/utils/ast-parser.ts` - AST parsing utilities
- `backend/src/utils/code-analyzer.ts` - Code analysis helpers
- `backend/src/utils/language-detector.ts` - Language detection

### 3.2 Security Checks

- OWASP Top 10 checks
- CWE (Common Weakness Enumeration) patterns
- Known vulnerability patterns
- Security rule engine

**Fajlovi:**

- `backend/src/services/security.service.ts` - Security analysis
- `backend/src/utils/security-patterns.ts` - Security patterns
- `backend/src/utils/owasp-checks.ts` - OWASP checks

### 3.3 LLM Integration

- OpenAI API integration (GPT-4)
- Prompt engineering za code analysis
- Response parsing i validation
- Error handling i retries
- Cost optimization (caching, model selection)

**Fajlovi:**

- `backend/src/services/llm.service.ts` - LLM integration
- `backend/src/utils/prompt-builder.ts` - Prompt construction
- `backend/src/utils/llm-cache.ts` - Response caching

### 3.4 Performance Analysis

- N+1 query detection
- Inefficient loop detection
- Memory leak patterns
- Performance best practices

**Fajlovi:**

- `backend/src/services/performance.service.ts` - Performance analysis

## Faza 4: Queue System i Workers

### 4.1 Queue Setup

- BullMQ queue configuration
- Job types definition
- Queue monitoring
- Retry logic i error handling

**Fajlovi:**

- `backend/src/config/queue.ts` - Queue configuration
- `backend/src/workers/analysis.worker.ts` - Analysis worker
- `backend/src/types/jobs.ts` - Job type definitions

### 4.2 Analysis Worker

- PR analysis job processing
- File-by-file analysis
- Issue aggregation
- Result storage

**Fajlovi:**

- `backend/src/workers/analysis.worker.ts` - Main worker
- `backend/src/services/analysis.service.ts` - Analysis orchestration

## Faza 5: API Endpoints

### 5.1 Repository Management

- List repositories
- Connect/disconnect repositories
- Repository settings
- Installation status

**Fajlovi:**

- `backend/src/api/routes/repositories.ts`
- `backend/src/services/repository.service.ts`
- `frontend/src/app/features/repositories/` - Repository module

### 5.2 Review Management

- Get review results
- Review history
- Issue details
- Review statistics

**Fajlovi:**

- `backend/src/api/routes/reviews.ts`
- `backend/src/services/review.service.ts`
- `frontend/src/app/features/reviews/` - Review module

### 5.3 Dashboard API

- Security score calculation
- Statistics aggregation
- Trend analysis
- Team metrics

**Fajlovi:**

- `backend/src/api/routes/dashboard.ts`
- `backend/src/services/dashboard.service.ts`
- `frontend/src/app/features/dashboard/` - Dashboard module

## Faza 6: Frontend Features

### 6.1 Dashboard

- Security score visualization
- Recent reviews list
- Issue statistics
- Trend charts

**Fajlovi:**

- `frontend/src/app/features/dashboard/dashboard.component.ts`
- `frontend/src/app/features/dashboard/components/security-score.component.ts`
- `frontend/src/app/features/dashboard/components/recent-reviews.component.ts`

### 6.2 Repository Management

- Repository list
- Installation flow
- Settings per repository
- Webhook status

**Fajlovi:**

- `frontend/src/app/features/repositories/repositories.component.ts`
- `frontend/src/app/features/repositories/components/repo-list.component.ts`
- `frontend/src/app/features/repositories/components/install-app.component.ts`

### 6.3 Review Details

- Issue list per review
- Issue details modal
- Code diff view
- Suggested fixes

**Fajlovi:**

- `frontend/src/app/features/reviews/review-detail.component.ts`
- `frontend/src/app/features/reviews/components/issue-card.component.ts`
- `frontend/src/app/features/reviews/components/code-viewer.component.ts`

### 6.4 Settings

- User profile
- Notification preferences
- API keys management
- Team settings

**Fajlovi:**

- `frontend/src/app/features/settings/settings.component.ts`
- `frontend/src/app/features/settings/components/notifications.component.ts`

## Faza 7: GitHub Integration

### 7.1 PR Comment Posting

- Format comment sa issue details
- Inline code comments
- Review summary comment
- Auto-dismiss resolved issues

**Fajlovi:**

- `backend/src/services/github-comment.service.ts` - Comment formatting
- `backend/src/utils/comment-formatter.ts` - Markdown formatting

### 7.2 Webhook Processing

- PR opened event
- PR synchronized event
- PR closed event
- Installation events

**Fajlovi:**

- `backend/src/api/routes/webhooks.ts` - Webhook handlers
- `backend/src/services/webhook.service.ts` - Event processing

## Faza 8: Testing i Quality

### 8.1 Backend Tests

- Unit tests za services
- Integration tests za API
- Worker tests
- Security pattern tests

**Fajlovi:**

- `backend/src/**/*.test.ts` - Test files
- `backend/jest.config.js` - Jest configuration

### 8.2 Frontend Tests

- Component tests
- Service tests
- E2E tests (opciono)

**Fajlovi:**

- `frontend/src/**/*.spec.ts` - Test files

## Faza 9: Deployment Setup

### 9.1 Environment Configuration

- Development environment
- Production environment
- Environment variables documentation

**Fajlovi:**

- `backend/.env.example`
- `frontend/src/environments/environment.prod.ts`
- `docker-compose.yml` - Local development

### 9.2 Docker Setup

- Backend Dockerfile
- Frontend Dockerfile
- Docker Compose za local development
- Database initialization

**Fajlovi:**

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`

## Faza 10: Documentation

### 10.1 API Documentation

- OpenAPI/Swagger specification
- Endpoint documentation
- Authentication guide

**Fajlovi:**

- `backend/docs/api.md`
- `backend/swagger.json`

### 10.2 User Documentation

- Setup guide
- GitHub App installation
- Usage guide
- Troubleshooting

**Fajlovi:**

- `README.md` - Main documentation
- `docs/setup.md` - Setup instructions
- `docs/github-app.md` - GitHub App guide

## Tehnologije i Dependencies

### Backend

- Node.js 18+
- TypeScript 5+
- Express.js
- Prisma ORM
- BullMQ (Redis)
- @octokit/app, @octokit/rest
- OpenAI SDK
- @babel/parser (AST parsing)
- Jest (testing)

### Frontend

- Angular 17+
- Angular Material
- RxJS
- Angular HttpClient
- Chart.js / ng2-charts (za grafike)

### Infrastructure

- PostgreSQL 14+
- Redis 7+
- GitHub App
- OpenAI API

## MVP Scope (Prva Faza)

Za MVP fokus na:

1. GitHub App integracija
2. Osnovna code analysis (security + AI)
3. PR comment posting
4. Dashboard sa osnovnim metrikama
5. Repository management

Ostaviti za kasnije:

- Multi-language support (početi sa JS/TS)
- Advanced performance analysis
- Custom rules engine
- Team collaboration features
- Analytics i reporting
