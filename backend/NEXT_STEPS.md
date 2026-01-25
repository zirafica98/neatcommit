# Sledeći Koraci - Quick Reference

## Šta smo uradili danas ✅

1. ✅ **Infrastruktura** - Express, TypeScript, config, logging
2. ✅ **Database** - Prisma + PostgreSQL, migrations
3. ✅ **Redis** - Queue sistem sa BullMQ
4. ✅ **Worker** - Analysis worker za procesiranje job-ova
5. ✅ **GitHub Integracija** - App service, GitHub service, webhook handler
6. ✅ **Testiranje** - Test endpoint-i, webhook simulacija
7. ✅ **Dokumentacija** - Kompletan dokument sa svim detaljima

## Status

- **Backend infrastruktura:** ✅ Gotovo
- **GitHub integracija:** ✅ Gotovo
- **Code Analysis Engine:** ⏳ Sledeće
- **Frontend:** ⏳ Kasnije
- **Authentication:** ⏳ Kasnije

## Sledeći korak: Code Analysis Engine

### Šta treba implementirati:

1. **AST Parser** (`src/utils/ast-parser.ts`)
   - Parsiranje JavaScript/TypeScript koda
   - Detekcija strukture koda
   - Izvlačenje konteksta

2. **Security Service** (`src/services/security.service.ts`)
   - OWASP Top 10 checks
   - CWE pattern detection
   - Security vulnerability scanning

3. **LLM Service** (`src/services/llm.service.ts`)
   - OpenAI API integracija
   - Prompt engineering
   - Response parsing

4. **Analysis Service** (`src/services/analysis.service.ts`)
   - Orkestracija analize
   - Kombinovanje rezultata
   - Issue aggregation

5. **Worker Update** (`src/workers/analysis.worker.ts`)
   - Integracija svih servisa
   - Dohvatanje PR fajlova
   - Analiza i čuvanje rezultata
   - Postavljanje komentara na PR

## Quick Commands

### Pokretanje
```bash
# Backend server
cd backend
npm run dev

# Database (Docker)
docker compose up -d

# Prisma Studio (pregled baze)
npx prisma studio
```

### Testiranje
```bash
# Health check
curl http://localhost:3000/health

# Test queue
curl -X POST http://localhost:3000/test/queue

# Test webhook (pogledaj TESTING.md za detalje)
curl -X POST http://localhost:3000/test/webhook ...
```

### Build & Lint
```bash
npm run build    # Kompajliraj TypeScript
npm run lint     # Proveri kod
npm run format   # Formatiraj kod
```

## Važni Fajlovi

- `DOCUMENTATION.md` - Kompletan dokument
- `TESTING.md` - Testiranje uputstva
- `.env` - Environment variables (ne commit-uj!)
- `prisma/schema.prisma` - Database schema

## Environment Variables

Proveri da li su sve potrebne varijable u `.env`:
- Database: `DATABASE_URL`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- GitHub: `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`
- OpenAI: `OPENAI_API_KEY` (za sledeći korak)
- JWT: `JWT_SECRET`, `JWT_REFRESH_SECRET`

## Sledeći Session

Kada nastaviš:
1. Pročitaj `DOCUMENTATION.md` za refresh
2. Kreni sa `src/utils/ast-parser.ts` - AST parsing
3. Zatim `src/services/security.service.ts` - Security checks
4. Zatim `src/services/llm.service.ts` - OpenAI integracija
5. Na kraju ažuriraj worker da koristi sve ovo

---

**Srećno sutra! 🚀**
