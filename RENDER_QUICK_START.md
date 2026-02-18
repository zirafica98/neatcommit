# ⚡ Render Quick Start - Backend Deployment

Brzi vodič za deployment backend-a na Render u 5 koraka.

## 🚀 Koraci

### 1. Kreiraj PostgreSQL Database
1. Render Dashboard → **"New +"** → **"PostgreSQL"**
2. Name: `elementer-database`
3. Plan: `Free` (za testiranje) ili `Starter` ($7/mesec)
4. Klikni **"Create"**
5. **Kopiraj Internal Database URL** (ne External!)

### 2. Kreiraj Redis (Opciono)
1. **"New +"** → **"Redis"**
2. Name: `elementer-redis`
3. Plan: `Free` ili `Starter` ($10/mesec)
4. Klikni **"Create"**

### 3. Deploy Web Service
1. **"New +"** → **"Web Service"**
2. Konektuj GitHub repository
3. Popuni:
   - **Name**: `elementer-backend`
   - **Root Directory**: `backend`
   - **Build Command**: 
     ```bash
     npm install && npm run build && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command**: `npm start`
   - **Plan**: `Free` (za testiranje) ili `Starter` ($7/mesec)

### 4. Environment Variables
Klikni **"Advanced"** → **"Add Environment Variable"**:

```bash
NODE_ENV=production
PORT=10000

# Database (Internal URL iz koraka 1)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (iz koraka 2)
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

# URLs (ažuriraj nakon deploy-a!)
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://elementer-backend.onrender.com
```

**VAŽNO za GITHUB_PRIVATE_KEY:**
- Koristi format sa `\n` karakterima
- Ili koristi **Secret Files** (bolje)

### 5. Deploy i Ažuriraj
1. Klikni **"Create Web Service"**
2. Sačekaj da se deploy završi (~5 minuta)
3. Kopiraj service URL: `https://elementer-backend.onrender.com`
4. Ažuriraj `API_URL` environment variable sa ovim URL-om
5. Ažuriraj GitHub App:
   - Webhook URL: `https://elementer-backend.onrender.com/webhook`
   - OAuth Callback: `https://elementer-backend.onrender.com/api/auth/github/callback`

## ✅ Test

```bash
curl https://elementer-backend.onrender.com/health
```

Trebalo bi da vrati:
```json
{"status":"ok","services":{"database":"connected","redis":"connected"}}
```

## 🔧 Troubleshooting

**Build fails?**
- Proveri **Logs** tab
- Proveri da li su sve dependencies u `package.json`

**Service crashes?**
- Proveri **Logs** tab
- Proveri environment variables
- Proveri database connection

**Database connection fails?**
- Koristi **Internal Database URL** (ne External!)
- Proveri da li je `DATABASE_URL` tačan

**Prisma migrations fail?**
- Build command već uključuje `npx prisma migrate deploy`
- Ako ne radi, pokreni ručno kroz **Shell** tab

## 📚 Detaljniji Vodič

Za detaljnije objašnjenje, vidi: `RENDER_DEPLOYMENT.md`
