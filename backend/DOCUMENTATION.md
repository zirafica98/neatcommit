# Backend Dokumentacija - Elementer AI Code Review

## Šta smo napravili do sada?

Kreirali smo osnovnu infrastrukturu backend aplikacije koja će analizirati kod sa GitHub-a i davati AI-powered code review. Evo šta smo uradili korak po korak.

---

## 1. Osnovni Setup

### `package.json`
**Šta radi:** Definiše sve biblioteke (dependencies) koje aplikacija koristi.

**Zašto nam treba:**
- `express` - web server koji prima HTTP zahteve
- `prisma` - za rad sa bazom podataka (umesto SQL-a)
- `bullmq` - za queue sistem (job-ove koji se izvršavaju u pozadini)
- `@octokit` - za komunikaciju sa GitHub API-jem
- `openai` - za AI analizu koda
- `@babel/parser` - za parsiranje JavaScript/TypeScript koda

**Korisnik:** Ne koristi direktno, ali `npm install` koristi ovaj fajl da instalira sve potrebno.

---

### `tsconfig.json`
**Šta radi:** Kaže TypeScript-u kako da kompajlira kod.

**Zašto nam treba:**
- Konvertuje TypeScript u JavaScript
- Proverava tipove (type safety)
- Generiše source maps za debugging

**Korisnik:** Ne koristi direktno, ali `npm run build` koristi ovaj fajl.

---

### `.eslintrc.json` i `.prettierrc`
**Šta radi:** 
- ESLint - proverava kvalitet koda (greške, best practices)
- Prettier - automatski formatira kod (indentacija, quotes, itd.)

**Zašto nam treba:** Da kod bude konzistentan i bez grešaka.

**Korisnik:** 
- `npm run lint` - proveri kod
- `npm run format` - formatiraj kod

---

## 2. Environment Variables

### `.env.example` i `.env`
**Šta radi:** Čuva konfiguraciju aplikacije (database URL, API keys, itd.)

**Zašto nam treba:** 
- Ne želimo da hardcode-ujemo osetljive podatke (passwords, API keys)
- Različite vrednosti za development i production

**Korisnik:** 
- Kopira `.env.example` u `.env`
- Popunjava vrednosti (database password, GitHub keys, itd.)

---

### `src/config/env.ts`
**Šta radi:** Učitava i validira environment variables.

**Kako funkcioniše:**
1. Učitava `.env` fajl
2. Validira da li su sve potrebne varijable prisutne
3. Proverava da li su validne (npr. URL mora biti validan URL)
4. Ako nešto nedostaje → aplikacija se ne pokreće sa jasnom greškom

**Funkcije:**
- `envSchema.parse()` - validira sve varijable
- Ako greška → prikaže koja varijabla nedostaje

**Korisnik:** Ne koristi direktno, ali aplikacija automatski koristi ove vrednosti.

---

## 3. Logging Sistem

### `src/utils/logger.ts`
**Šta radi:** Loguje sve što se dešava u aplikaciji (info, errors, warnings).

**Kako funkcioniše:**
- U development: loguje u konzolu (terminal) SA bojama i emoji ikonama
- U production: loguje u fajlove (`logs/error.log`, `logs/combined.log`)
- Svaki log ima timestamp i detalje
- **Poboljšanja:** Emoji ikone za lakše prepoznavanje, kompaktniji format, meta podaci na novom redu

**Funkcije:**
- `logger.info()` - obične poruke
- `logger.error()` - greške
- `logger.warn()` - upozorenja
- `logger.debug()` - detaljne informacije

**Emoji ikone:**
- ✅ Success/Connected/Ready
- ❌ Error/Failed
- ⚠️ Warning
- ℹ️ Info/Processing
- 🚀 Server running
- 💾 Database
- 🔴 Redis
- 📡 Webhook/Event
- ⚙️ Job/Queue
- 👷 Worker

**Korisnik:** Ne koristi direktno, ali vidi logove u terminalu kada pokreće server.

**Primer:**
```typescript
logger.info('Server started'); 
// Output: 19:44:07 🚀 info Server running on port 3000

logger.error('Database failed'); 
// Output: 19:44:07 ❌ error Database connection failed
```

---

## 4. Database Setup

### `prisma/schema.prisma`
**Šta radi:** Definiše strukturu baze podataka (tabele, kolone, veze).

**Kako funkcioniše:**
- Definišete modele (User, Repository, Review, itd.)
- Prisma generiše SQL i kreira tabele
- Prisma generiše TypeScript tipove

**Modeli koje smo kreirali:**
1. **User** - GitHub korisnici
2. **Installation** - GitHub App instalacije
3. **Repository** - Repozitorijumi gde je App instaliran
4. **Review** - Code review za svaki PR
5. **Issue** - Pojedinačni problemi nađeni u kodu
6. **ReviewComment** - Komentari postavljeni na GitHub PR

**Korisnik:**
- `npx prisma generate` - generiše TypeScript tipove
- `npx prisma migrate dev` - kreira tabele u bazi
- `npx prisma studio` - otvara web UI za pregled podataka

---

### `src/config/database.ts`
**Šta radi:** Povezuje aplikaciju sa PostgreSQL bazom podataka.

**Kako funkcioniše:**
1. Kreira Prisma Client (alat za rad sa bazom)
2. Povezuje se sa bazom kada se aplikacija pokrene
3. Loguje sve database upite (u development)
4. Diskonektuje se kada se aplikacija zatvori

**Funkcije:**
- `connectDatabase()` - povezuje se sa bazom
- `disconnectDatabase()` - diskonektuje se
- `prisma` - export-ovani client za rad sa bazom

**Korisnik:** Ne koristi direktno, ali aplikacija automatski koristi ovo.

**Primer korišćenja u kodu:**
```typescript
import prisma from './config/database';

// Kreiraj korisnika
const user = await prisma.user.create({
  data: { githubId: 123, username: 'test' }
});

// Pročitaj korisnika
const user = await prisma.user.findUnique({
  where: { githubId: 123 }
});
```

---

## 5. Redis Setup

### `src/config/redis.ts`
**Šta radi:** Povezuje aplikaciju sa Redis-om (za queue i caching).

**Kako funkcioniše:**
1. Kreira Redis client
2. Povezuje se sa Redis-om
3. Loguje evente (connect, error, close)
4. Test funkcija za proveru konekcije

**Funkcije:**
- `testRedisConnection()` - testira da li Redis radi (PING komanda)
- `redis` - export-ovani client za rad sa Redis-om

**Korisnik:** Ne koristi direktno, ali aplikacija koristi Redis za queue.

**Primer korišćenja:**
```typescript
import redis from './config/redis';

// Sačuvaj vrednost
await redis.set('key', 'value');

// Pročitaj vrednost
const value = await redis.get('key');
```

---

## 6. Queue System

### `src/config/queue.ts`
**Šta radi:** Kreira queue (red čekanja) za job-ove koji se izvršavaju u pozadini.

**Kako funkcioniše:**
- Queue čuva job-ove u Redis-u
- Job-ovi se procesiraju jedan po jedan (ili više istovremeno)
- Ako job padne → automatski retry (3 puta)
- Završeni job-ovi se čuvaju 24h, failed job-ovi 7 dana

**Zašto nam treba:**
- Code analysis može trajati 5+ minuta
- Ne možemo da čekamo toliko u webhook handler-u
- Queue omogućava da se analiza izvršava u pozadini

**Korisnik:** Ne koristi direktno, ali job-ovi se automatski dodaju u queue.

---

### `src/types/jobs.ts`
**Šta radi:** Definiše tipove podataka za job-ove u queue-u.

**Struktura:**
```typescript
AnalyzePRJob {
  installationId: number;  // GitHub App installation ID
  owner: string;           // Repo owner (npr. "facebook")
  repo: string;            // Repo name (npr. "react")
  pullNumber: number;      // PR broj (npr. 1234)
  sha: string;            // Commit SHA
  prId: string;           // GitHub PR ID
  prUrl: string;          // URL do PR-a
  prTitle: string;        // Naslov PR-a
}
```

**Korisnik:** Ne koristi direktno, ali definiše šta job sadrži.

---

### `src/workers/analysis.worker.ts`
**Šta radi:** Procesira job-ove iz queue-a (analizira PR-ove u pozadini).

**Kako funkcioniše:**
1. Sluša `code-analysis` queue
2. Kada stigne novi job → procesira ga
3. Loguje progres (šta radi)
4. Ako uspe → `completed` event
5. Ako padne → `failed` event (i retry)

**Funkcije:**
- `analysisWorker` - worker instanca koja procesira job-ove
- Event handlers: `completed`, `failed`, `error`, `ready`

**Trenutno stanje:**
- Osnovna struktura je tu
- Loguje kada procesira job
- Kasnije ćemo dodati stvarnu analizu koda

**Korisnik:** Ne koristi direktno, ali worker automatski procesira job-ove.

**Flow:**
```
Webhook stigne → Job se doda u queue → Worker vidi job → Worker procesira → Gotovo!
```

---

## 7. Express Server

### `src/index.ts`
**Šta radi:** Glavni fajl aplikacije - pokreće web server.

**Kako funkcioniše:**
1. Kreira Express aplikaciju
2. Dodaje middleware (CORS, body parser, logging)
3. Definiše rute (endpoints)
4. Povezuje se sa bazom i Redis-om
5. Pokreće server na portu 3000

**Funkcije:**
- `startServer()` - glavna funkcija koja pokreće sve
- `app.use()` - dodaje middleware
- `app.get()`, `app.post()` - definiše rute

**Rute koje smo kreirali:**
- `GET /health` - provera da li server radi
- `POST /test/queue` - test endpoint za dodavanje job-a u queue
- `POST /test/webhook` - test endpoint za simulaciju GitHub webhook eventa
- `POST /webhook/github` - real webhook endpoint za GitHub App

**Middleware:**
- CORS - dozvoljava zahteve sa frontend-a
- Body parser - parsira JSON iz request body-ja
- Request logging - loguje svaki request
- Error handling - hvata greške i vraća 500 error
- 404 handler - vraća 404 za nepostojeće rute

**Korisnik:**
- Pokreće: `npm run dev`
- Vidi logove u terminalu
- Može testirati: `curl http://localhost:3000/health`

---

## 8. GitHub Integracija

### `src/services/github-app.service.ts`
**Šta radi:** Upravlja GitHub App autentifikacijom i installation token-ima.

**Kako funkcioniše:**
1. Kreira GitHub App instancu sa private key-om
2. Generiše JWT token za App autentifikaciju
3. Dobija installation access token za pristup GitHub API-ju
4. Upravlja webhook signature verifikacijom

**Funkcije:**
- `getInstallationToken()` - dobija installation access token
- `getInstallationOctokit()` - dobija Octokit instancu sa installation token-om
- `isAppInstalled()` - proverava da li je App instaliran

**Korisnik:** Ne koristi direktno, ali GitHub App koristi ovo za autentifikaciju.

**Primer korišćenja:**
```typescript
import { getInstallationOctokit } from './services/github-app.service';

// Dobij Octokit instancu sa installation token-om
const octokit = await getInstallationOctokit(installationId);
// Sada možeš da koristiš octokit.rest.* za GitHub API pozive
```

---

### `src/services/github.service.ts`
**Šta radi:** Komunikacija sa GitHub API-jem - dobijanje PR podataka, fajlova, postavljanje komentara.

**Kako funkcioniše:**
- Koristi installation token za pristup GitHub API-ju
- Wrapper oko Octokit API-ja za jednostavnije korišćenje
- Automatski upravlja autentifikacijom

**Funkcije:**
- `getPullRequest()` - dobija PR podatke (title, state, author, itd.)
- `getPullRequestFiles()` - dobija listu fajlova u PR-u sa diff podacima
- `getFileContent()` - dobija sadržaj fajla sa GitHub-a
- `createPRComment()` - postavlja komentar na PR
- `createReviewComment()` - postavlja review komentar na određenu liniju koda
- `getInstallationRepositories()` - dobija listu repozitorijuma za instalaciju

**Korisnik:** Ne koristi direktno, ali worker i webhook handler koriste ovo.

**Primer korišćenja:**
```typescript
import { getPullRequestFiles } from './services/github.service';

// Dobij fajlove u PR-u
const files = await getPullRequestFiles(installationId, owner, repo, pullNumber);
// files[0].patch sadrži diff za taj fajl
```

---

### `src/api/routes/webhooks.ts`
**Šta radi:** Prima i procesira webhook evente od GitHub-a.

**Kako funkcioniše:**
1. Prima POST zahtev od GitHub-a sa event podacima
2. Proverava webhook signature (security)
3. Procesira različite evente:
   - `pull_request` - kada se otvori ili ažurira PR
   - `installation` - kada se App instalira ili deinstalira
4. Sačuva podatke u bazi
5. Dodaje job u queue za analizu

**Eventi koje obrađujemo:**
- `pull_request.opened` - Novi PR → dodaje job u queue
- `pull_request.synchronize` - PR ažuriran → dodaje job u queue
- `installation.created` - App instaliran → čuva u bazi
- `installation.deleted` - App deinstaliran → briše iz baze

**Funkcije:**
- `handlePullRequestEvent()` - procesira PR evente
- `handleInstallationEvent()` - procesira installation evente
- `handleInstallationCreated()` - čuva instalaciju u bazi
- `handleInstallationDeleted()` - briše instalaciju iz baze

**Korisnik:** GitHub automatski šalje webhook-e na ovaj endpoint.

**Flow:**
```
GitHub PR otvoren → Webhook event stigne → Handler procesira → 
Sačuva u bazi → Dodaje job u queue → Worker procesira
```

---

## Kako sve funkcioniše zajedno?

### Scenario: Korisnik pokreće server

```
1. Korisnik pokrene: npm run dev
   ↓
2. index.ts se izvršava
   ↓
3. Učitava environment variables (env.ts)
   ↓
4. Povezuje se sa bazom (database.ts)
   ↓
5. Povezuje se sa Redis-om (redis.ts)
   ↓
6. Pokreće worker (analysis.worker.ts)
   ↓
7. Pokreće Express server
   ↓
8. Server sluša na portu 3000
```

### Scenario: Test queue endpoint

```
1. Korisnik pošalje: POST /test/queue
   ↓
2. Express primi request
   ↓
3. Handler doda job u queue (Redis)
   ↓
4. Worker vidi novi job
   ↓
5. Worker procesira job
   ↓
6. Worker loguje progres
   ↓
7. Job se završava
```

### Scenario: GitHub Webhook Event

```
1. GitHub PR otvoren → GitHub šalje webhook
   ↓
2. Webhook handler primi event (webhooks.ts)
   ↓
3. Proveri signature i procesiraj event
   ↓
4. Ako je PR event:
   - Pronađi Installation u bazi
   - Pronađi Repository u bazi
   - Kreiraj/Update Review u bazi
   - Dodaj job u queue
   ↓
5. Worker vidi novi job
   ↓
6. Worker procesira (trenutno samo loguje, kasnije će analizirati kod)
   ↓
7. Job se završava
```

### Scenario: Installation Event

```
1. GitHub App instaliran → GitHub šalje webhook
   ↓
2. Webhook handler primi installation event
   ↓
3. Kreiraj/Update User u bazi
   ↓
4. Kreiraj/Update Installation u bazi
   ↓
5. Sačuvaj sve repozitorijume u bazi
   ↓
6. Gotovo - App je spreman za korišćenje
```

---

## Struktura fajlova

```
backend/
├── src/
│   ├── index.ts              # Entry point - pokreće server
│   ├── config/
│   │   ├── env.ts           # Environment variables validacija
│   │   ├── database.ts      # Prisma connection
│   │   ├── redis.ts         # Redis connection
│   │   └── queue.ts         # Queue setup
│   ├── api/
│   │   └── routes/
│   │       └── webhooks.ts  # Webhook handler za GitHub
│   ├── services/
│   │   ├── github-app.service.ts  # GitHub App autentifikacija
│   │   └── github.service.ts      # GitHub API client
│   ├── utils/
│   │   └── logger.ts        # Logging sistem
│   ├── workers/
│   │   └── analysis.worker.ts  # Worker za procesiranje job-ova
│   └── types/
│       └── jobs.ts          # Tipovi za job-ove
├── prisma/
│   └── schema.prisma        # Database schema
├── logs/                    # Log fajlovi (kreira se automatski)
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── DOCUMENTATION.md        # Ova dokumentacija
└── TESTING.md              # Testiranje uputstva
```

---

## Šta sledeće?

Sledeći koraci:
1. **GitHub integracija** - GitHub App setup, webhook handling
2. **Authentication** - GitHub OAuth za user login
3. **Code analysis** - AST parsing, security checks, AI analysis
4. **API endpoints** - REST API za frontend

---

## Kako testirati šta smo napravili?

### 1. Pokrenite server
```bash
cd backend
npm run dev
```

### 2. Testirajte health check
```bash
curl http://localhost:3000/health
```

### 3. Testirajte queue
```bash
curl -X POST http://localhost:3000/test/queue
```

### 4. Testirajte webhook (simulacija)
```bash
# Prvo installation event (da se kreira repository u bazi)
curl -X POST http://localhost:3000/test/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "installation",
    "payload": { ... }
  }'

# Zatim PR event
curl -X POST http://localhost:3000/test/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "pull_request",
    "payload": { ... }
  }'
```

**Detaljne test komande:** Pogledajte `TESTING.md` fajl.

### 5. Proverite logove
U server terminalu trebalo bi da vidite:
- ✅ Database connected
- ✅ Redis connected
- ✅ Analysis worker ready
- 📡 Test webhook received
- ⚙️ Analysis job added to queue
- 👷 Processing analysis job...

---

## Pitanja i odgovori

**Q: Zašto koristimo TypeScript?**
A: Type safety - TypeScript proverava tipove pre pokretanja, što smanjuje greške.

**Q: Zašto Prisma umesto čistog SQL-a?**
A: Type safety i jednostavniji API. Umesto SQL-a pišete TypeScript kod.

**Q: Zašto Redis za queue?**
A: Redis je brz (u memoriji) i dobar za queue sisteme.

**Q: Zašto worker u pozadini?**
A: Code analysis traje dugo (5+ minuta). Worker omogućava da se to izvršava u pozadini bez blokiranja servera.

**Q: Šta je middleware?**
A: Funkcije koje se izvršavaju pre/posle request-a (npr. logging, CORS, error handling).

---

## Rezime

Do sada smo napravili:
✅ Osnovnu infrastrukturu (Express, TypeScript, config)
✅ Database setup (Prisma + PostgreSQL)
✅ Redis setup (za queue)
✅ Queue sistem (BullMQ)
✅ Worker (za procesiranje job-ova u pozadini)
✅ Logging sistem sa emoji ikonama i čitljivim formatom
✅ GitHub App Service (autentifikacija)
✅ GitHub Service (API komunikacija)
✅ Webhook Handler (primanje GitHub eventa)
✅ Test endpoint-i za lokalno testiranje
✅ Basic server sa health check i test endpoint-ima

**Status:**
- ✅ Infrastruktura - Gotovo
- ✅ GitHub integracija - Gotovo
- ⏳ Code Analysis Engine - Sledeće (AST parsing, security checks, AI analiza)
- ⏳ Frontend - Kasnije
- ⏳ Authentication - Kasnije

Sledeće: Code Analysis Engine! 🚀
