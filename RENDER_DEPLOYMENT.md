# 🚀 Render Deployment Vodič - Backend

Ovaj vodič će ti pomoći da deploy-uješ backend na Render.

## 📋 Preduslovi

1. **Render Account** - Kreiraj nalog na [render.com](https://render.com)
2. **GitHub Repository** - Backend kod mora biti na GitHub-u
3. **Environment Variables** - Pripremi sve potrebne environment variables

---

## 🔧 Korak 1: Priprema Projekta

### 1.1. Proveri Build Scripts

U `package.json` već imaš:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate"
  }
}
```

### 1.2. Ažuriraj PORT u kodu (opciono)

Render automatski postavlja `PORT` environment variable. Proveri da li tvoj kod koristi `process.env.PORT`:

```typescript
// backend/src/index.ts
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

---

## 🗄️ Korak 2: Kreiraj PostgreSQL Database na Render-u

### 2.1. Kreiraj Novu Database

1. Idi na [Render Dashboard](https://dashboard.render.com)
2. Klikni **"New +"** → **"PostgreSQL"**
3. Popuni formu:
   - **Name**: `elementer-database`
   - **Database**: `elementer`
   - **User**: `elementer`
   - **Region**: Izaberi najbliži (npr. Frankfurt)
   - **Plan**: `Starter` ($7/mesec) ili `Free` (za testiranje)
4. Klikni **"Create Database"**

### 2.2. Sačuvaj Connection String

1. Kada se database kreira, idi na **"Info"** tab
2. Kopiraj **"Internal Database URL"** (koristi se za Render servise)
3. Ili kopiraj **"External Database URL"** (za lokalni pristup)

**Format:**
```
postgresql://user:password@host:port/database
```

---

## 🔴 Korak 3: Kreiraj Redis Instance (Opciono, ali preporučeno)

### 3.1. Kreiraj Redis

1. Klikni **"New +"** → **"Redis"**
2. Popuni formu:
   - **Name**: `elementer-redis`
   - **Region**: Isti kao database
   - **Plan**: `Starter` ($10/mesec) ili `Free` (za testiranje)
3. Klikni **"Create Redis"**

### 3.2. Sačuvaj Redis Credentials

1. Idi na **"Info"** tab
2. Sačuvaj:
   - **Host**
   - **Port**
   - **Password**

---

## 🌐 Korak 4: Deploy Backend Service

### 4.1. Konektuj GitHub Repository

1. Klikni **"New +"** → **"Web Service"**
2. Konektuj GitHub repository:
   - Klikni **"Connect account"** ako još nisi
   - Izaberi repository: `your-username/elementer`
   - Klikni **"Connect"**

### 4.2. Konfiguriši Service

Popuni formu:

**Basic Settings:**
- **Name**: `elementer-backend`
- **Region**: Isti kao database i Redis
- **Branch**: `main` (ili `master`)
- **Root Directory**: `backend` (ako je backend u podfolderu)
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build && npx prisma generate
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

**Advanced Settings:**
- **Instance Type**: `Starter` ($7/mesec) ili `Free` (za testiranje)
- **Auto-Deploy**: `Yes` (automatski deploy na push)

### 4.3. Environment Variables

Klikni **"Advanced"** → **"Add Environment Variable"** i dodaj:

#### Database & Redis
```bash
NODE_ENV=production
PORT=10000

# Database (koristi Internal Database URL)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

#### JWT Secrets
```bash
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d
```

#### GitHub App
```bash
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

**VAŽNO za GITHUB_PRIVATE_KEY:**
- Moraju biti u formatu sa `\n` karakterima
- Ili koristi Render's **"Secret File"** opciju (bolje rešenje)

#### OpenAI
```bash
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-3.5-turbo
LLM_MAX_TOKENS=1000
LLM_MAX_CODE_LINES=2000
```

#### URLs
```bash
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-backend-service.onrender.com
```

**VAŽNO:** 
- `API_URL` će biti `https://elementer-backend.onrender.com` (ili tvoj custom domain)
- Ažuriraj ovo nakon što se service deploy-uje

### 4.4. Secret Files (Preporučeno za Private Key)

Umesto da stavljaš `GITHUB_PRIVATE_KEY` kao environment variable, koristi **Secret Files**:

1. Klikni **"Advanced"** → **"Secret Files"**
2. Klikni **"Add Secret File"**
3. **Path**: `/app/.github-private-key.pem`
4. **Contents**: Paste tvoj private key (bez `\n`, samo raw key)
5. U kodu, čitaj fajl:
   ```typescript
   // backend/src/config/env.ts
   import fs from 'fs';
   
   const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH || '/app/.github-private-key.pem';
   const GITHUB_PRIVATE_KEY = fs.existsSync(privateKeyPath) 
     ? fs.readFileSync(privateKeyPath, 'utf8')
     : process.env.GITHUB_PRIVATE_KEY;
   ```

### 4.5. Deploy

1. Klikni **"Create Web Service"**
2. Render će automatski:
   - Clone repository
   - Install dependencies
   - Build projekat
   - Run migrations (ako ih imaš)
   - Start server

---

## 🔄 Korak 5: Database Migrations

### 5.1. Prisma Migrations

Render ne pokreće automatski Prisma migrations. Trebaš da ih pokreneš ručno:

**Opcija 1: Kroz Render Shell**
1. Idi na service → **"Shell"** tab
2. Pokreni:
   ```bash
   npx prisma migrate deploy
   ```

**Opcija 2: Dodaj u Build Command**
Ažuriraj **Build Command**:
```bash
npm install && npm run build && npx prisma generate && npx prisma migrate deploy
```

**Opcija 3: Kroz Render Script**
1. Klikni **"Shell"** tab
2. Pokreni:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

### 5.2. Proveri Database

```bash
npx prisma studio
# Ili kroz Render Shell
```

---

## 🔍 Korak 6: Test Deployment

### 6.1. Health Check

```bash
curl https://your-service.onrender.com/health
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

### 6.2. Test API Endpoints

```bash
# Test auth
curl https://your-service.onrender.com/api/auth/github

# Test webhook (sa GitHub signature)
curl -X POST https://your-service.onrender.com/webhook \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature-256: sha256=..."
```

---

## 🔗 Korak 7: Ažuriraj GitHub App Settings

### 7.1. Webhook URL

1. Idi na GitHub App settings
2. U sekciji **"Webhook"**:
   - **Webhook URL**: `https://your-service.onrender.com/webhook`
   - Klikni **"Update webhook"**

### 7.2. OAuth Callback URL

1. U sekciji **"OAuth App"**:
   - **Authorization callback URL**: `https://your-service.onrender.com/api/auth/github/callback`

### 7.3. Ažuriraj Environment Variables

1. Idi na Render Dashboard → Service → **"Environment"**
2. Ažuriraj `API_URL`:
   ```
   API_URL=https://your-service.onrender.com
   ```

---

## 🎯 Korak 8: Custom Domain (Opciono)

### 8.1. Dodaj Custom Domain

1. Idi na service → **"Settings"** → **"Custom Domains"**
2. Klikni **"Add Custom Domain"**
3. Unesi domen: `api.yourdomain.com`
4. Dodaj DNS records kako Render kaže:
   - **CNAME**: `api.yourdomain.com` → `your-service.onrender.com`

### 8.2. SSL Certificate

Render automatski generiše SSL certificate za custom domain.

---

## 📊 Korak 9: Monitoring & Logs

### 9.1. View Logs

1. Idi na service → **"Logs"** tab
2. Vidiš real-time logs

### 9.2. Metrics

1. Idi na service → **"Metrics"** tab
2. Vidiš:
   - CPU usage
   - Memory usage
   - Request rate
   - Response time

---

## 🔧 Troubleshooting

### Problem: Build Fails

**Rešenje:**
1. Proveri **"Logs"** tab za greške
2. Proveri da li su sve dependencies u `package.json`
3. Proveri build command

### Problem: Service Crashes

**Rešenje:**
1. Proveri **"Logs"** tab
2. Proveri environment variables
3. Proveri da li je database konektovan
4. Proveri da li je Redis konektovan (ako koristiš)

### Problem: Database Connection Fails

**Rešenje:**
1. Proveri da li koristiš **Internal Database URL** (ne External)
2. Proveri da li je `DATABASE_URL` tačan
3. Proveri da li je database kreiran

### Problem: Prisma Migrations Fail

**Rešenje:**
1. Pokreni migrations ručno kroz Shell:
   ```bash
   npx prisma migrate deploy
   ```
2. Proveri da li je `DATABASE_URL` tačan
3. Proveri da li imaš sve migracije u `prisma/migrations/`

### Problem: Private Key Format Error

**Rešenje:**
1. Koristi **Secret Files** umesto environment variable
2. Ili proveri da li je `GITHUB_PRIVATE_KEY` u formatu sa `\n` karakterima

### Problem: Rate Limit na Free Plan

**Rešenje:**
- Free plan ima ograničenja
- Upgrade na Starter plan ($7/mesec)

---

## 💰 Pricing

### Free Plan
- ✅ 750 sati/mesec (dovoljno za testiranje)
- ✅ 512 MB RAM
- ❌ Spins down nakon 15 minuta neaktivnosti
- ❌ Nema custom domain

### Starter Plan ($7/mesec)
- ✅ Unlimited hours
- ✅ 512 MB RAM
- ✅ Always on (ne spin down)
- ✅ Custom domain

### Database
- **Free**: 90 MB storage
- **Starter**: 1 GB storage ($7/mesec)

### Redis
- **Free**: 25 MB
- **Starter**: 100 MB ($10/mesec)

---

## 📝 Checklist

- [ ] Render account kreiran
- [ ] GitHub repository konektovan
- [ ] PostgreSQL database kreiran
- [ ] Redis instance kreirana (opciono)
- [ ] Web service kreiran
- [ ] Environment variables postavljene
- [ ] Database migrations pokrenute
- [ ] Health check prolazi
- [ ] GitHub App webhook URL ažuriran
- [ ] OAuth callback URL ažuriran
- [ ] API_URL ažuriran
- [ ] Test webhook primljen
- [ ] Logs provereni

---

## 🎉 Gotovo!

Tvoj backend je sada deployed na Render-u! 

**Service URL**: `https://your-service.onrender.com`

Sledeći korak: Deploy frontend na Vercel/Netlify i ažuriraj `FRONTEND_URL` u environment variables.
