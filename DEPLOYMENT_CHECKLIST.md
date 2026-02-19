# ✅ Deployment Checklist

Koristi ovaj checklist tokom deployovanja da ne zaboraviš ništa.

## 📋 Pre-Deployment

- [ ] GitHub repo je public ili imaš pristup
- [ ] Svi environment varijable su pripremljene
- [ ] GitHub App je kreiran i konfigurisan
- [ ] OpenAI API key je spreman
- [ ] JWT secrets su generisani (min 32 karaktera)

## 🔵 FAZA 1: Baza Podataka

### Render PostgreSQL
- [ ] Render nalog kreiran
- [ ] PostgreSQL baza kreirana
- [ ] Database name: `elementer`
- [ ] Connection string sačuvan
- [ ] Baza je aktivna i dostupna

### Test konekcije
- [ ] Lokalno testiranje sa Render bazom radi
- [ ] Prisma može da se poveže

## 🟢 FAZA 2: Backend

### Redis
- [ ] Redis kreiran na Render
- [ ] Redis connection string sačuvan
- [ ] Redis je aktivna i dostupna

### Backend Web Service
- [ ] Web Service kreiran na Render
- [ ] GitHub repo povezan
- [ ] Root directory: `backend`
- [ ] Build command postavljen
- [ ] Start command postavljen

### Environment Variables
- [ ] `DATABASE_URL` - iz PostgreSQL
- [ ] `REDIS_HOST` - iz Redis
- [ ] `REDIS_PORT` - iz Redis
- [ ] `REDIS_PASSWORD` - iz Redis
- [ ] `JWT_SECRET` - generisan
- [ ] `JWT_REFRESH_SECRET` - generisan
- [ ] `GITHUB_APP_ID` - iz GitHub App
- [ ] `GITHUB_APP_NAME` - iz GitHub App
- [ ] `GITHUB_PRIVATE_KEY` - formatiran sa `\n`
- [ ] `GITHUB_CLIENT_ID` - iz OAuth App
- [ ] `GITHUB_CLIENT_SECRET` - iz OAuth App
- [ ] `GITHUB_WEBHOOK_SECRET` - iz GitHub App
- [ ] `OPENAI_API_KEY` - iz OpenAI
- [ ] `FRONTEND_URL` - privremeno `http://localhost:4200`
- [ ] `API_URL` - Render URL (ažuriraj posle deploy-a)

### Build & Deploy
- [ ] Build prošao uspešno
- [ ] Prisma migrations pokrenute
- [ ] Prisma client generisan
- [ ] Backend startuje bez grešaka
- [ ] Health check radi: `/health`

### Post-Deploy
- [ ] Promo code "KUM" kreiran
- [ ] Admin korisnik kreiran (ako treba)
- [ ] API endpoints testirani

## 🟡 FAZA 3: Frontend

### Render Static Site Setup (PREPORUČENO)
- [ ] Static Site kreiran na Render
- [ ] GitHub repo povezan
- [ ] Root Directory: `frontend`
- [ ] Build Command: `npm install && npm run build --configuration production`
- [ ] Publish Directory: `dist/frontend`

### Frontend Configuration
- [ ] `environment.prod.ts` ažuriran
  - [ ] `apiUrl` = backend Render URL
  - [ ] `githubAppName` = GitHub App name

### Deploy
- [ ] Build prošao uspešno
- [ ] Frontend dostupan na Render URL (npr. `https://elementer-frontend.onrender.com`)

### Backend Update
- [ ] Backend `FRONTEND_URL` ažuriran sa Render Static Site URL-om
- [ ] Backend restartovan
- [ ] CORS testiran

### ALTERNATIVA: Heroku Setup
- [ ] Heroku CLI instaliran
- [ ] Heroku login
- [ ] Heroku app kreiran
- [ ] `static.json` dodat
- [ ] Buildpack postavljen (nodejs)
- [ ] `package.json` ima `heroku-postbuild` script
- [ ] Git repo povezan sa Heroku
- [ ] Build prošao uspešno
- [ ] Frontend dostupan na Heroku URL
- [ ] Backend `FRONTEND_URL` ažuriran sa Heroku URL-om

## 🔧 Post-Deployment

### GitHub App
- [ ] Webhook URL ažuriran: `https://your-backend.onrender.com/webhook`
- [ ] OAuth Callback URL: `https://your-backend.onrender.com/api/auth/github/callback`
- [ ] GitHub App je "Public" (ako želiš)

### Testing
- [ ] Frontend se učitava
- [ ] Login radi
- [ ] GitHub OAuth radi
- [ ] API pozivi rade
- [ ] CORS nema problema
- [ ] Webhooks rade
- [ ] Promo code radi

### Monitoring
- [ ] Render logovi se prate
- [ ] Heroku logovi se prate
- [ ] Error tracking (Sentry) radi (ako je postavljen)

## 🐛 Troubleshooting

Ako nešto ne radi, proveri:
- [ ] Environment varijable su ispravne
- [ ] URLs su ispravni (bez trailing slash)
- [ ] CORS settings su ispravni
- [ ] GitHub App permissions su ispravni
- [ ] Database i Redis su aktivni
- [ ] Logovi za greške

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete
