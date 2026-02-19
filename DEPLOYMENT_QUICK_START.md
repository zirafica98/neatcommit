# 🚀 Quick Start - Deployment

Brzi vodič za deployovanje u 3 faze.

## 📚 Dokumentacija

- **Detaljni vodič**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## ⚡ Brzi Start

### 1️⃣ Baza Podataka (5 min)

**Render PostgreSQL** (preporučeno) ili **Supabase** (besplatno zauvek)

```bash
# 1. Idi na https://render.com
# 2. New → PostgreSQL
# 3. Sačuvaj DATABASE_URL
```

### 2️⃣ Backend (15 min)

**Render Web Service**

```bash
# 1. New → Web Service
# 2. Connect GitHub repo
# 3. Root Directory: backend
# 4. Build: npm install && npm run build && npx prisma generate && npx prisma migrate deploy
# 5. Start: npm start
# 6. Dodaj sve env varijable (vidi .env.example)
```

**VAŽNO**: 
- Kreiraj i **Redis** na Render (za BullMQ)
- `GITHUB_PRIVATE_KEY` mora biti sa `\n` umesto novih linija

### 3️⃣ Frontend (5 min)

**Render Static Site** (PREPORUČENO - besplatno, ne spava)

```bash
# 1. Ažuriraj environment.prod.ts sa backend URL-om
# 2. Render Dashboard → New → Static Site
# 3. Connect GitHub repo
# 4. Root Directory: frontend
# 5. Build Command: npm install && npm run build --configuration production
# 6. Publish Directory: dist/frontend
```

**Ažuriraj**:
- `frontend/src/environments/environment.prod.ts` - dodaj backend URL
- Backend `FRONTEND_URL` - dodaj Render Static Site URL

## 🔑 Ključne Environment Varijable

### Backend (Render):
```
DATABASE_URL=postgresql://...
REDIS_HOST=...
JWT_SECRET=... (min 32 chars)
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=... (sa \n)
OPENAI_API_KEY=...
FRONTEND_URL=https://your-app.herokuapp.com
API_URL=https://your-backend.onrender.com
```

### Frontend:
- Ažuriraj `environment.prod.ts` sa backend URL-om

## ✅ Provera

1. Backend health: `https://your-backend.onrender.com/health`
2. Frontend: `https://your-app.herokuapp.com`
3. Login radi
4. GitHub OAuth radi

## 🆘 Problemi?

Vidi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → Troubleshooting sekcija

---

**Srećno! 🎉**
