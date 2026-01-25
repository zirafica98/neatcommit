# 🚀 Elementer Backend - AI Code Review Platform

**Elementer** je AI-powered code review sistem koji automatski analizira Pull Request-ove na GitHub-u i postavlja detaljne komentare sa security, performance i best practice preporukama.

---

## 📚 Dokumentacija

### 🏗️ Glavna Dokumentacija

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Kompletan arhitektura pregled sa dijagramima
  - Arhitektura sistema
  - Flow dijagrami
  - Database schema
  - API endpoints
  - Performance optimizacije

- **[SERVICES.md](./SERVICES.md)** - Detaljno objašnjenje svakog servisa
  - GitHub App Service
  - GitHub Service
  - Security Service
  - LLM Service
  - Analysis Service
  - Comment Service
  - Algoritmi i primeri

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Osnovna dokumentacija
  - Setup instrukcije
  - Environment variables
  - Database setup
  - Redis setup
  - Queue sistem

### 📖 Specifične Dokumentacije

- **[CODE_ANALYSIS_EXPLAINED.md](./CODE_ANALYSIS_EXPLAINED.md)** - Kako funkcioniše analiza koda
- **[WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)** - GitHub webhook setup
- **[TESTING.md](./TESTING.md)** - Testiranje instrukcije
- **[DATABASE_QUERIES.md](./DATABASE_QUERIES.md)** - Database query primeri
- **[PRIVATE_KEY_FORMAT.md](./PRIVATE_KEY_FORMAT.md)** - GitHub private key format

### 📋 Quick Reference

- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Sledeći koraci za development
- **[COMPLETED.md](./COMPLETED.md)** - Lista završenih feature-a

---

## 🎯 Quick Start

### 1. Instalacija

```bash
npm install
```

### 2. Environment Variables

Kopirajte `.env.example` u `.env` i popunite:

```bash
cp .env.example .env
```

### 3. Database Setup

```bash
# Pokreni PostgreSQL i Redis
docker compose up -d

# Primijeni migracije
npx prisma migrate dev

# Generiši Prisma Client
npx prisma generate
```

### 4. Pokreni Server

```bash
npm run dev
```

---

## 🏛️ Arhitektura

### Visokonivo Pregled

```
GitHub Webhook → Webhook Handler → Queue → Worker → Analysis → Comments
                                                      ↓
                                              Database (PostgreSQL)
                                                      ↓
                                              Redis (Queue)
```

### Komponente

| Komponenta | Opis |
|------------|------|
| **Webhook Handler** | Prima GitHub webhook event-e |
| **Queue (BullMQ)** | Asinhrono procesiranje job-ova |
| **Analysis Worker** | Procesira analizu PR-a |
| **GitHub Service** | Komunikacija sa GitHub API-jem |
| **Security Service** | Statička security analiza |
| **LLM Service** | AI analiza (OpenAI GPT-4) |
| **Analysis Service** | Orchestrator analize |
| **Comment Service** | Formatiranje i postavljanje komentara |

---

## 🔄 Flow

### Pull Request Analiza

1. **Developer otvori PR** na GitHub-u
2. **GitHub šalje webhook** našem serveru
3. **Webhook Handler** dodaje job u queue
4. **Worker** procesira job:
   - Dohvata PR fajlove
   - Analizira svaki fajl (Security + LLM)
   - Kombinuje rezultate
   - Postavlja komentare na PR
5. **Developer vidi komentare** na PR-u

### Analiza Algoritam

```
Code → Language Detection → AST Parsing
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
            Security Service      LLM Service
                    ↓                   ↓
                    └─────────┬─────────┘
                              ↓
                    Combine & Deduplicate
                              ↓
                    Calculate Score
                              ↓
                    Format Comments
                              ↓
                    Post to GitHub
```

---

## 📊 Features

### ✅ Implementirano

- ✅ GitHub App integracija
- ✅ Webhook handling (PR, Installation events)
- ✅ Asinhrono procesiranje (BullMQ queue)
- ✅ Security analiza (pattern matching)
- ✅ LLM analiza (OpenAI GPT-4)
- ✅ GitHub PR komentari (summary + inline)
- ✅ Database persistence (PostgreSQL)
- ✅ Error handling i retry logika
- ✅ Logging (Winston)

### 🚧 U Planu

- 🔲 Više programskih jezika (Python, Java, Go)
- 🔲 Custom security rules
- 🔲 CI/CD integracija
- 🔲 Web dashboard
- 🔲 Email/Slack notifikacije

---

## 🛠️ Development

### Komande

```bash
# Development server
npm run dev

# Build
npm run build

# Production server
npm start

# Database
npx prisma studio          # Database GUI
npx prisma migrate dev     # Primijeni migracije
npx prisma generate        # Generiši Prisma Client

# Code Quality
npm run lint               # ESLint check
npm run lint:fix           # ESLint auto-fix
npm run format             # Prettier format
```

### Testiranje

```bash
# Test queue
curl -X POST http://localhost:3000/test/queue

# Test webhook
curl -X POST http://localhost:3000/test/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "pull_request", "payload": {...}}'

# Test analysis
curl -X POST http://localhost:3000/test/analysis \
  -H "Content-Type: application/json" \
  -d '{"code": "const x = 1;", "filename": "test.ts"}'
```

---

## 📁 Struktura Projekta

```
backend/
├── src/
│   ├── api/
│   │   └── routes/
│   │       └── webhooks.ts          # Webhook handler
│   ├── config/
│   │   ├── database.ts              # Prisma client
│   │   ├── env.ts                   # Environment variables
│   │   ├── queue.ts                 # BullMQ queue
│   │   └── redis.ts                 # Redis client
│   ├── services/
│   │   ├── github-app.service.ts    # GitHub App auth
│   │   ├── github.service.ts        # GitHub API
│   │   ├── github-comment.service.ts # Comment formatting
│   │   ├── security.service.ts      # Security analysis
│   │   ├── llm.service.ts          # LLM analysis
│   │   └── analysis.service.ts      # Analysis orchestrator
│   ├── utils/
│   │   ├── ast-parser.ts            # AST parsing
│   │   ├── language-detector.ts     # Language detection
│   │   ├── comment-formatter.ts     # Comment formatting
│   │   └── logger.ts                # Winston logger
│   ├── workers/
│   │   └── analysis.worker.ts       # Analysis worker
│   └── index.ts                     # Express server
├── prisma/
│   └── schema.prisma                # Database schema
└── docker-compose.yml                # PostgreSQL + Redis
```

---

## 🔐 Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/elementer

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# GitHub App
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...

# OpenAI
OPENAI_API_KEY=...

# URLs
FRONTEND_URL=http://localhost:4200
API_URL=http://localhost:3000
```

---

## 📈 Performance

- **Concurrency:** 5 simultanih job-ova
- **Rate Limiting:** 10 job-ova/minut
- **Retry:** 3 pokušaja sa exponential backoff
- **Job Retention:** 24h (completed), 7d (failed)

---

## 🐛 Troubleshooting

### Problem: "Octokit does not have rest property"

**Rešenje:** Proverite da li je `@octokit/plugin-rest-endpoint-methods` instaliran i da li se koristi pravilno.

### Problem: "OpenAI quota exceeded"

**Rešenje:** Sistem i dalje radi sa Security Service-om. Dodajte kredite na OpenAI nalog za LLM analizu.

### Problem: "Line could not be resolved" (422 error)

**Rešenje:** To je normalno - linija nije u PR diff-u. Sistem automatski preskače takve komentare.

### Problem: "Private key format error"

**Rešenje:** Proverite [PRIVATE_KEY_FORMAT.md](./PRIVATE_KEY_FORMAT.md) za formatiranje instrukcije.

---

## 📞 Support

Za pitanja i probleme, proverite:
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Arhitektura i flow
2. [SERVICES.md](./SERVICES.md) - Detaljno objašnjenje servisa
3. [TESTING.md](./TESTING.md) - Testiranje i debugging

---

## 📄 License

MIT

---

**Poslednje ažuriranje:** 2026-01-25
