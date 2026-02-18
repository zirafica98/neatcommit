# GitHub App - Javna Dostupnost Vodič

Ovaj vodič će ti pomoći da učiniš svoju GitHub App javno dostupnom i testiraš je na drugim repozitorijima.

## 📋 Preduslovi

1. **Deployment Backend-a** - Backend mora biti javno dostupan (npr. Heroku, Railway, Render, AWS, itd.)
2. **Deployment Frontend-a** - Frontend mora biti javno dostupan (npr. Vercel, Netlify, GitHub Pages, itd.)
3. **GitHub App** - Kreirana GitHub App na GitHub-u

---

## 🔧 Korak 1: GitHub App Postavke

### 1.1. Idi na GitHub App Settings

1. Otvori: https://github.com/settings/apps
2. Klikni na svoju GitHub App
3. Ili direktno: `https://github.com/settings/apps/YOUR_APP_NAME`

### 1.2. Promeni App Visibility

1. U sekciji **"General"** → **"Public"**
2. Ako je trenutno **"Private"**, promeni na **"Public"**
3. Ovo omogućava drugim korisnicima da instaliraju tvoju app

### 1.3. Ažuriraj Webhook URL

1. U sekciji **"Webhook"**:
   - **Webhook URL**: `https://your-backend-domain.com/webhook`
   - **Webhook secret**: Koristi isti `GITHUB_WEBHOOK_SECRET` iz `.env` fajla
   - **Content type**: `application/json`

2. **Webhook events** - Omogući sledeće evente:
   - ✅ `push`
   - ✅ `pull_request` (opened, synchronize, closed)
   - ✅ `installation` (created, deleted)
   - ✅ `installation_repositories` (added, removed)
   - ✅ `repository` (created, deleted)

### 1.4. Ažuriraj OAuth App Settings

1. U sekciji **"OAuth App"** (ili kreiraj novi OAuth App):
   - **Homepage URL**: `https://your-frontend-domain.com`
   - **Authorization callback URL**: `https://your-backend-domain.com/api/auth/github/callback`

### 1.5. Permissions & Events

1. U sekciji **"Permissions & events"**:

   **Repository permissions:**
   - ✅ **Contents**: Read (za čitanje koda)
   - ✅ **Metadata**: Read (automatski)
   - ✅ **Pull requests**: Read (za PR review)
   - ✅ **Issues**: Read (opciono, za issue tracking)

   **Account permissions:**
   - ✅ **Email addresses**: Read (za korisničke informacije)

   **Subscribe to events:**
   - ✅ Push
   - ✅ Pull request
   - ✅ Installation
   - ✅ Installation repositories

### 1.6. Where can this GitHub App be installed?

1. Izaberi jednu od opcija:
   - **Only on this account** - Samo na tvom GitHub nalogu
   - **Any account** - Na bilo kom GitHub nalogu (preporučeno za javnu app)

---

## 🚀 Korak 2: Deployment Backend-a

### 2.1. Environment Variables

Postavi sledeće environment variables na hosting platformi:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis (opciono, ali preporučeno)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# GitHub
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# OpenAI
OPENAI_API_KEY=sk-...

# URLs (VAŽNO!)
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-backend-domain.com

# Optional
NODE_ENV=production
SENTRY_DSN=https://... (opciono)
```

**VAŽNO:** 
- `GITHUB_PRIVATE_KEY` mora biti u formatu sa `\n` karakterima
- `FRONTEND_URL` i `API_URL` moraju biti javno dostupni HTTPS URL-ovi

### 2.2. Build & Deploy

```bash
cd backend
npm install
npm run build
npm start
```

### 2.3. Test Backend-a

```bash
curl https://your-backend-domain.com/health
```

Trebalo bi da vrati:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 🌐 Korak 3: Deployment Frontend-a

### 3.1. Environment Variables

Kreiraj `.env.production` fajl ili postavi na hosting platformi:

```bash
# API URL
VITE_API_URL=https://your-backend-domain.com
# ili
NG_APP_API_URL=https://your-backend-domain.com
```

### 3.2. Build & Deploy

```bash
cd frontend
npm install
npm run build
# Deploy dist/ folder na hosting platformu
```

### 3.3. Test Frontend-a

Otvori: `https://your-frontend-domain.com`

---

## 🔗 Korak 4: Ažuriraj GitHub App sa Novim URL-ovima

### 4.1. Webhook URL

1. Idi na GitHub App settings
2. U sekciji **"Webhook"**:
   - Promeni **Webhook URL** na: `https://your-backend-domain.com/webhook`
   - Klikni **"Update webhook"**

### 4.2. OAuth Callback URL

1. U sekciji **"OAuth App"**:
   - **Authorization callback URL**: `https://your-backend-domain.com/api/auth/github/callback`

### 4.3. Test Webhook

GitHub će automatski poslati test webhook. Proveri backend logs da vidiš da li je primljen.

---

## 👥 Korak 5: Instalacija App-a na Drugim Repozitorijima

### 5.1. Public Installation URL

Tvoja GitHub App sada ima javnu installation URL:

```
https://github.com/apps/YOUR_APP_NAME/installations/new
```

Ili korisnici mogu:
1. Ići na bilo koji repozitorij
2. **Settings** → **Integrations** → **GitHub Apps**
3. Kliknuti **"Configure"** pored tvoje app

### 5.2. Installation Flow

1. Korisnik klikne na installation link
2. GitHub će tražiti dozvole (permissions)
3. Korisnik izabere repozitorije na kojima želi da instalira app
4. GitHub će poslati `installation.created` webhook na tvoj backend
5. Backend će sačuvati installation ID u bazi

### 5.3. Test Installation

1. Otvori: `https://github.com/apps/YOUR_APP_NAME/installations/new`
2. Izaberi test repozitorij
3. Klikni **"Install"**
4. Proveri backend logs da vidiš da li je webhook primljen

---

## 🧪 Korak 6: Testiranje na Drugim Repozitorijima

### 6.1. Kreiraj Test Repozitorij

1. Kreiraj novi repozitorij na GitHub-u (ili koristi postojeći)
2. Instaliraj app na tom repozitoriju (korak 5)

### 6.2. Test Push Event

1. Napravi commit i push:
   ```bash
   git add .
   git commit -m "Test commit"
   git push
   ```

2. Proveri backend logs - trebalo bi da vidiš webhook event

### 6.3. Test Pull Request

1. Kreiraj pull request
2. Proveri backend logs - trebalo bi da vidiš `pull_request` event

---

## 🔍 Troubleshooting

### Problem: Webhook se ne prima

**Rešenje:**
1. Proveri da li je webhook URL tačan: `https://your-backend-domain.com/webhook`
2. Proveri da li je `GITHUB_WEBHOOK_SECRET` isti u `.env` i GitHub App settings
3. Proveri backend logs za greške
4. Testiraj webhook endpoint:
   ```bash
   curl -X POST https://your-backend-domain.com/webhook \
     -H "X-GitHub-Event: push" \
     -H "X-Hub-Signature-256: sha256=..." \
     -d '{"test": true}'
   ```

### Problem: OAuth callback ne radi

**Rešenje:**
1. Proveri da li je callback URL tačan: `https://your-backend-domain.com/api/auth/github/callback`
2. Proveri da li su `GITHUB_CLIENT_ID` i `GITHUB_CLIENT_SECRET` tačni
3. Proveri CORS settings na backend-u

### Problem: App se ne može instalirati

**Rešenje:**
1. Proveri da li je app **"Public"** (ne "Private")
2. Proveri da li je **"Where can this GitHub App be installed?"** postavljeno na **"Any account"**
3. Proveri permissions - možda neki permission nedostaje

### Problem: Rate limit exceeded

**Rešenje:**
1. Povećaj rate limit u `rate-limiter.ts` za production
2. Koristi Redis za distributed rate limiting
3. Implementiraj exponential backoff

---

## 📝 Checklist

- [ ] GitHub App je **"Public"**
- [ ] Webhook URL je postavljen na production URL
- [ ] OAuth callback URL je postavljen na production URL
- [ ] Backend je deployed i javno dostupan
- [ ] Frontend je deployed i javno dostupan
- [ ] Environment variables su postavljeni na hosting platformi
- [ ] Webhook secret je isti u `.env` i GitHub App settings
- [ ] Permissions su konfigurisane
- [ ] Webhook events su omogućeni
- [ ] Test installation je uspešan
- [ ] Test webhook je primljen

---

## 🔐 Security Best Practices

1. **Nikad ne commit-uj `.env` fajl** sa stvarnim credentials
2. **Koristi HTTPS** za sve URL-ove
3. **Validiraj webhook signature** (već implementirano)
4. **Koristi rate limiting** (već implementirano)
5. **Rotiraj secrets** redovno
6. **Monitoruj logs** za sumnjive aktivnosti

---

## 📚 Dodatni Resursi

- [GitHub App Documentation](https://docs.github.com/en/apps)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
- [Webhook Events](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads)

---

## 🎉 Gotovo!

Sada bi tvoja GitHub App trebalo da bude javno dostupna i spremna za testiranje na drugim repozitorijima!
