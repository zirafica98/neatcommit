# 🚀 Deployment Guide - Elementer

Kompletan vodič za deployovanje aplikacije na free servere u 3 faze.

## 📋 Pregled

- **Faza 1: Baza podataka** → Render PostgreSQL (FREE)
- **Faza 2: Backend** → Render Web Service (FREE)
- **Faza 3: Frontend** → Heroku (FREE)

---

## 🔵 FAZA 1: Baza Podataka (PostgreSQL)

### Opcije za FREE PostgreSQL:

#### **Opcija 1: Render PostgreSQL (PREPORUČENO)**
- ✅ Besplatno do 90 dana (pa $7/mesec)
- ✅ 1GB storage
- ✅ Automatski backup
- ✅ Lako povezivanje sa Render backend-om

#### **Opcija 2: Supabase**
- ✅ Besplatno zauvek
- ✅ 500MB storage
- ✅ 2GB bandwidth/mesec
- ✅ Postgres 15

#### **Opcija 3: Neon**
- ✅ Besplatno zauvek
- ✅ 3GB storage
- ✅ Unlimited projects
- ✅ Postgres 15

### Koraci za Render PostgreSQL:

1. **Kreiraj Render nalog**
   - Idi na https://render.com
   - Sign up sa GitHub nalogom

2. **Kreiraj PostgreSQL bazu**
   - Dashboard → New → PostgreSQL
   - **Name**: `elementer-db`
   - **Database**: `elementer`
   - **User**: `elementer_user`
   - **Region**: Izaberi najbližu (npr. Frankfurt)
   - **PostgreSQL Version**: 15
   - **Plan**: Free (90 dana, pa $7/mesec)
   - Klikni **Create Database**

3. **Sačuvaj Connection String**
   - Render će automatski kreirati **Internal Database URL**
   - Format: `postgresql://user:password@host:port/database`
   - **SAČUVAJ OVU VREDNOST** - trebaće ti za backend!
   -HOST NAME: dpg-d6b1s30boq4c73bjt0i0-a
   -POST : 5432
   -USERNAME: elementer_user
   -PASS: Akaib7qLv6igREqfq3mkp6cwLlMCsq92
   - Format: `postgresql://elementer_user:Akaib7qLv6igREqfq3mkp6cwLlMCsq92@dpg-d6b1s30boq4c73bjt0i0-a:5432/elementer`

4. **Test konekcije (opciono)**
   ```bash
   # Lokalno testiranje sa Render bazom
   cd backend
   # Dodaj DATABASE_URL u .env
   echo "DATABASE_URL=postgresql://user:password@host:port/database" >> .env
   npx prisma migrate deploy
   ```

### ✅ Provera Faze 1:
- [ ] PostgreSQL baza kreirana na Render
- [ ] Connection string sačuvan
- [ ] Baza je dostupna i radi

---

## 🟢 FAZA 2: Backend (Render Web Service)

### Preduslovi:
- ✅ PostgreSQL baza već postoji (Faza 1)
- ✅ GitHub repo sa backend kodom
- ✅ Render nalog

### Koraci:

1. **Pripremi backend za production**

   ```bash
   cd backend
   
   # Proveri da li postoji .env.example
   # Ako ne postoji, kreiraj ga:
   ```

2. **Kreiraj `backend/.env.example`** (ako ne postoji):
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Database (iz Faze 1)
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Redis (Render Redis - FREE tier)
   REDIS_HOST=your-redis-host.onrender.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   
   # JWT Secrets (generiši nove za production!)
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
   JWT_REFRESH_EXPIRES_IN=30d
   
   # GitHub App
   GITHUB_APP_ID=your-github-app-id
   GITHUB_APP_NAME=your-app-name
   GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
   GITHUB_CLIENT_ID=your-oauth-client-id
   GITHUB_CLIENT_SECRET=your-oauth-client-secret
   GITHUB_WEBHOOK_SECRET=your-webhook-secret
   
   # OpenAI
   OPENAI_API_KEY=sk-...
   LLM_MODEL=gpt-3.5-turbo
   LLM_MAX_TOKENS=1000
   LLM_MAX_CODE_LINES=2000
   
   # URLs
   FRONTEND_URL=https://your-app.herokuapp.com
   API_URL=https://your-backend.onrender.com
   
   # Sentry (opciono)
   SENTRY_DSN=https://...
   ```

3. **Kreiraj Redis** (za BullMQ queue):

   **Opcija A: Render Key Value (Redis)** (PREPORUČENO - lako povezivanje):
   - Dashboard → New → **Key Value**
   - **Name**: `elementer-redis`
   - **Plan**: Free
   - **Region**: Ista kao baza (npr. Frankfurt)
   - Klikni **Create Key Value Store**
   - Render će automatski kreirati Redis instance
   - Sačuvaj connection details:
     - **Host**: `elementer-redis-xxxxx.onrender.com` ili IP
     - **Port**: `6379`
     - **Password**: Automatski generisan (vidi u dashboard-u)
   
   **Opcija B: Upstash Redis** (alternativa - besplatno zauvek):
   - Idi na https://upstash.com
   - Sign up (besplatno)
   - Dashboard → Create Database
   - **Name**: `elementer-redis`
   - **Type**: Regional
   - **Region**: Izaberi najbližu (npr. eu-west-1)
   - Klikni **Create**
   - Sačuvaj:
     - **Endpoint** (hostname, npr. `eu-west-1-12345.upstash.io`)
     - **Port**: `6379` (ili `6380` za TLS)
     - **Password**: (automatski generisan)
   
   **Opcija C: Redis Cloud** (besplatno):
   - Idi na https://redis.com/try-free/
   - Sign up i kreiraj free database
   - Sačuvaj connection details

4. **Kreiraj Web Service na Render**:
   - Dashboard → New → Web Service
   - **Connect Repository**: Izaberi GitHub repo
   - **Root Directory**: `backend`
   - **Name**: `elementer-backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Plan**: Free (može da "spava" posle 15 min neaktivnosti)

5. **Dodaj Environment Variables**:
   Klikni na **Environment** tab i dodaj sve varijable iz `.env.example`:
   
   **VAŽNO**: 
   - `DATABASE_URL` - iz PostgreSQL baze (Faza 1)
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - iz Redis instance
   - `GITHUB_PRIVATE_KEY` - mora biti u jednom redu sa `\n` umesto novih linija:
     ```
     -----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----
     ```
   - `FRONTEND_URL` - za sada može biti `http://localhost:4200` (ažuriraćeš posle Faze 3)
   - `API_URL` - **VAŽNO**: Render backend URL (npr. `https://neatcommit.onrender.com`)
     - Ovo se koristi za GitHub OAuth redirect URI i webhook callback-ove
     - Mora biti tačan URL sa `https://`
     - Render ne postavlja ovo automatski - moraš ručno dodati!

6. **Deploy**:
   - Render će automatski pokrenuti build
   - Prati logove u **Logs** tabu
   - Ako build prođe, backend će biti dostupan na `https://your-backend.onrender.com`

7. **Pokreni Prisma Migrations**:
   ```bash
   # Preko Render Shell (Dashboard → Shell)
   cd backend
   npx prisma migrate deploy
   npx prisma generate
   ```

8. **Kreiraj Promo Code** (ako treba):
   ```bash
   # Preko Render Shell
   node scripts/create-promo-code.js
   ```

### ✅ Provera Faze 2:
- [ ] Redis kreiran i povezan
- [ ] Backend Web Service kreiran
- [ ] Sve environment varijable postavljene
- [ ] Build prošao uspešno
- [ ] Prisma migrations pokrenute
- [ ] Backend API dostupan na `https://neatcommit.onrender.com`
- [ ] Health check endpoint radi: `https://neatcommit.onrender.com/health`

---

## 🟡 FAZA 3: Frontend (Vercel - PREPORUČENO)

> **Napomena**: Render Static Site ima problema sa SPA routing-om. Vercel ima bolju podršku za Angular SPA aplikacije.

### Preduslovi:
- ✅ Backend već radi (Faza 2)
- ✅ GitHub repo sa frontend kodom
- ✅ Vercel nalog (besplatno - sign up sa GitHub)

### Zašto Vercel?
- ✅ Besplatno zauvek
- ✅ Ne "spava" kao Heroku
- ✅ Brže učitavanje (Edge Network)
- ✅ Automatski HTTPS
- ✅ Automatski SPA routing support (ne treba `_redirects`)
- ✅ Automatski build optimizacija
- ✅ Preview deployments za svaki PR

### Koraci:

1. **Ažuriraj `environment.prod.ts`**:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-backend.onrender.com', // Backend URL iz Faze 2
     githubAppName: 'your-app-name',
   };
   ```
   **VAŽNO**: Ažuriraj `apiUrl` sa tačnim Render backend URL-om!

2. **Kreiraj Vercel Account**:
   - Idi na https://vercel.com
   - Klikni **Sign Up** → **Continue with GitHub**
   - Autorizuj Vercel da pristupa tvojim repozitorijumima

3. **Deploy na Vercel**:
   - **Vercel Dashboard** → **Add New** → **Project**
   - **Import Git Repository**: Izaberi GitHub repo
   - **Configure Project**:
     - **Framework Preset**: Angular (automatski detektuje)
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist/frontend/browser`
     - **Install Command**: `npm install`
   - Klikni **Deploy**

4. **Vercel će automatski**:
   - Build-ovati Angular aplikaciju
   - Deploy-ovati na Edge Network
   - Dodeliti URL (npr. `https://elementer-frontend.vercel.app`)

5. **Ažuriraj Backend `FRONTEND_URL`**:
   - Idi na Render Dashboard → Backend Web Service → Environment
   - Ažuriraj `FRONTEND_URL` sa Vercel URL-om:
     ```
     FRONTEND_URL=https://elementer-frontend.vercel.app
     ```
   - Backend će se automatski restartovati

### ✅ Provera Faze 3:
- [ ] Vercel account kreiran
- [ ] `environment.prod.ts` ažuriran sa backend URL-om
- [ ] Build prošao uspešno
- [ ] Frontend dostupan na `https://your-frontend.vercel.app`
- [ ] Backend `FRONTEND_URL` ažuriran
- [ ] CORS radi (frontend može da poziva backend)
- [ ] SPA routing radi (možeš refresh-ovati bilo koju rutu)

---

## 🟡 ALTERNATIVA 1: Frontend na Render Static Site

> **Napomena**: Render Static Site ima problema sa SPA routing-om. Preporučujemo Vercel umesto Render-a za frontend.

Ako ipak želiš da koristiš Render Static Site:

1. **Kreiraj Static Site na Render**:
   - Dashboard → New → **Static Site**
   - **Connect Repository**: Izaberi GitHub repo
   - **Name**: `elementer-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist/frontend/browser`
   - **Plan**: Free

2. **Render možda neće pravilno servirati SPA rute** - kontaktiraj Render support ili koristi Vercel.

---

## 🟡 ALTERNATIVA 2: Frontend na Heroku

### Preduslovi:
- ✅ Backend već radi (Faza 2)
- ✅ GitHub repo sa frontend kodom
- ✅ Render nalog (isti kao za backend)

### Zašto Render Static Site?
- ✅ Besplatno zauvek
- ✅ Ne "spava" kao Heroku
- ✅ Brže učitavanje (CDN)
- ✅ Automatski HTTPS
- ✅ Lako povezivanje sa Render backend-om

### Koraci:

1. **Ažuriraj `environment.prod.ts`**:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-backend.onrender.com', // Backend URL iz Faze 2
     githubAppName: 'your-app-name',
   };
   ```
   **VAŽNO**: Ažuriraj `apiUrl` sa tačnim Render backend URL-om!

2. **Kreiraj Static Site na Render**:
   - Dashboard → New → **Static Site**
   - **Connect Repository**: Izaberi GitHub repo
   - **Name**: `elementer-frontend`
   - **Branch**: `main` (ili `master`)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist/frontend/browser` (Angular 19 build-uje u `browser` subfolder)
   - **Plan**: Free
   - Klikni **Create Static Site**

   **VAŽNO**: 
   - `angular.json` već ima `fileReplacements` konfigurisan da koristi `environment.prod.ts` u production build-u
   - `_redirects` fajl je već konfigurisan u `public/` folderu za SPA routing

3. **Render će automatski**:
   - Build-ovati Angular aplikaciju
   - Deploy-ovati na CDN
   - Dodeliti URL (npr. `https://elementer-frontend.onrender.com`)

4. **Ažuriraj Backend `FRONTEND_URL`**:
   - Idi na Render Dashboard → Backend Web Service → Environment
   - Ažuriraj `FRONTEND_URL` sa Render Static Site URL-om:
     ```
     FRONTEND_URL=https://elementer-frontend.onrender.com
     ```
   - Backend će se automatski restartovati

### ✅ Provera Faze 3:
- [ ] Static Site kreiran na Render
- [ ] `environment.prod.ts` ažuriran sa backend URL-om
- [ ] Build prošao uspešno
- [ ] Frontend dostupan na `https://your-frontend.onrender.com`
- [ ] Backend `FRONTEND_URL` ažuriran
- [ ] CORS radi (frontend može da poziva backend)

---

## 🟡 ALTERNATIVA: Frontend na Heroku (ako želiš)

Ako ipak želiš da koristiš Heroku umesto Render Static Site:

1. **Instaliraj Heroku CLI**:
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Login i kreiraj app**:
   ```bash
   heroku login
   cd frontend
   heroku create elementer-frontend
   ```

3. **Dodaj buildpack i deploy**:
   ```bash
   heroku buildpacks:set heroku/nodejs
   git push heroku main
   ```

4. **Ažuriraj backend `FRONTEND_URL`** sa Heroku URL-om

---

## 👤 Kreiranje admin korisnika na serveru

Backend na Renderu nema SSH pristup. Admina kreiraš **lokalno**, koristeći **production bazu** (istu koju koristi server).

### Način 1: Lokalno sa production `DATABASE_URL` (preporučeno)

1. Na svom računaru otvori `backend` i pripremi privremeni `.env` sa **production** vrednostima (kopiraj `DATABASE_URL` iz Render Dashboard → Backend Service → Environment).
2. Pokreni skriptu (ne moraš da commituješ `.env` – koristi ga samo za ovaj jedan pokretaj):

**Novi admin (login username + password, preko "Admin Login" na sajtu):**
```bash
cd backend
# Postavi DATABASE_URL na production (Render PostgreSQL URL iz Dashboard → Environment)
export DATABASE_URL="postgresql://user:pass@host:port/database"
npm run create-admin
# ili sa svojim podacima:
npm run create-admin myadmin admin@domen.com JakaLozinka123
```

**Postojećem korisniku dati admin (npr. GitHub username):**
```bash
cd backend
export DATABASE_URL="postgresql://user:pass@host:port/database"
npm run set-admin GITHUB_USERNAME
```

3. Posle toga korisnik treba da se izloguje i ponovo uloguje da bi video Admin link.

### Način 2: Render Shell (ako imaš pristup skriptama u deploy-u)

Ako tvoj Render build uključuje folder `scripts/` (npr. deploy-uješ ceo repo, ne samo `dist/`):

1. Render Dashboard → tvoj Backend Service → **Shell** (otvori konzolu).
2. U Shell-u:
```bash
node scripts/create-admin.js admin admin@example.com TvojaLozinka123
# ili za postojećeg korisnika:
node scripts/set-admin.js GITHUB_USERNAME
```

**Napomena:** Ako build koristi samo `npm run build` i ne kopira `scripts/`, Shell nema te fajlove – tada koristi Način 1.

---

## 🔧 Post-Deployment Checklist

### Backend:
- [ ] Health check radi: `https://your-backend.onrender.com/health`
- [ ] API endpoints rade
- [ ] Database konekcija radi
- [ ] Redis konekcija radi
- [ ] GitHub webhooks rade (proveri u GitHub App settings)
- [ ] Promo code "KUM" kreiran

### Frontend:
- [ ] Frontend se učitava bez grešaka
- [ ] Login radi
- [ ] API pozivi rade
- [ ] CORS nema problema

### GitHub App:
- [ ] Webhook URL ažuriran: `https://your-backend.onrender.com/webhook`
- [ ] OAuth Callback URL ažuriran: `https://your-backend.onrender.com/api/auth/github/callback`
- [ ] GitHub App je "Public" (ako želiš da drugi koriste)

---

## 🐛 Troubleshooting

### Backend ne startuje:
- Proveri logove na Render Dashboard
- Proveri da li su sve environment varijable postavljene
- Proveri `GITHUB_PRIVATE_KEY` format (mora biti sa `\n`)

### Database connection error:
- Proveri `DATABASE_URL` format
- Proveri da li je baza aktivna na Render
- Proveri firewall settings

### Redis connection error:
- Proveri `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Proveri da li je Redis aktivna na Render

### Frontend ne može da pozove backend:
- Proveri CORS settings u backend `index.ts`
- Proveri `FRONTEND_URL` u backend env varijablama
- Proveri `apiUrl` u `environment.prod.ts`

### GitHub webhooks ne rade:
- Proveri webhook URL u GitHub App settings
- Proveri `GITHUB_WEBHOOK_SECRET`
- Proveri da li backend prima webhook requests (logovi)

### "A JSON web token could not be decoded" (GitHub / installation callback):
- Backend sada prvo pokušava **ručno** generisan JWT (bez @octokit/auth-app) – ako i dalje vidiš ovu grešku:
- **GITHUB_PRIVATE_KEY na Renderu:** mora biti **ceo** ključ, u **jednom redu** sa literal `\n` (backslash + n) na mestima novog reda. Ako uneseš ključ sa pravim Enter/novim redovima, Render često **čita samo prvi red** i ključ bude neispravan.
- Proveri da vrednost nije skraćena (npr. kopiraj iz fajla .pem i zameni svaki novi red sa `\n` u jednom redu).
- **GITHUB_APP_ID** mora biti broj (npr. `12345`), bez navodnika koji bi ga pretvorili u string.

---

## 📝 Environment Variables Summary

### Backend (Render):
```
DATABASE_URL=postgresql://...
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GITHUB_APP_ID=...
GITHUB_APP_NAME=...
GITHUB_PRIVATE_KEY=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
FRONTEND_URL=https://your-app.herokuapp.com
API_URL=https://your-backend.onrender.com
```

### Frontend (Render Static Site):
```
# Frontend ne koristi environment varijable
# Sve se konfiguriše u environment.prod.ts fajlu
```

---

## 💰 Troškovi

### FREE Tier:
- **Render PostgreSQL**: Besplatno 90 dana, pa $7/mesec
- **Render Key Value (Redis)**: Besplatno
- **Render Web Service**: Besplatno (spava posle 15 min)
- **Render Static Site**: Besplatno zauvek (ne spava!)

### Alternativa (sve besplatno zauvek):
- **Supabase** (PostgreSQL) - FREE
- **Upstash** (Redis) - FREE tier
- **Render** (Backend) - FREE
- **Render Static Site** (Frontend) - FREE (preporučeno!)
- **Vercel/Netlify** (Frontend) - FREE (alternativa)

---

## 🎯 Sledeći Koraci

1. ✅ Deploy bazu (Faza 1)
2. ✅ Deploy backend (Faza 2)
3. ✅ Deploy frontend (Faza 3)
4. ✅ Testiraj celu aplikaciju
5. ✅ Ažuriraj GitHub App webhook URL
6. ✅ Kreiraj admin korisnika
7. ✅ Testiraj promo code "KUM"

---

**Srećno sa deployovanjem! 🚀**
