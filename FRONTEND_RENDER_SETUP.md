# 🟡 Frontend Deployment - Render Static Site

Brzi vodič za deployovanje Angular frontend-a na Render Static Site.

## ✅ Prednosti Render Static Site

- ✅ Besplatno zauvek
- ✅ Ne "spava" kao Heroku
- ✅ Brže učitavanje (CDN)
- ✅ Automatski HTTPS
- ✅ Lako povezivanje sa Render backend-om

## 📋 Koraci

### 1. Ažuriraj `environment.prod.ts`

Pre deploy-a, ažuriraj backend URL:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.onrender.com', // AŽURIRAJ sa Render backend URL-om
  githubAppName: 'your-app-name', // AŽURIRAJ sa GitHub App name-om
};
```

### 2. Kreiraj Static Site na Render

1. **Render Dashboard** → **New** → **Static Site**
2. **Connect Repository**: Izaberi GitHub repo
3. **Podesi**:
   - **Name**: `elementer-frontend`
   - **Branch**: `main` (ili `master` - proveri koji branch koristiš)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist/frontend`
   - **Plan**: Free
4. Klikni **Create Static Site**

### 3. Render će automatski

- Build-ovati Angular aplikaciju
- Deploy-ovati na CDN
- Dodeliti URL (npr. `https://elementer-frontend.onrender.com`)

### 4. Ažuriraj Backend `FRONTEND_URL`

- Idi na **Render Dashboard** → **Backend Web Service** → **Environment**
- Ažuriraj `FRONTEND_URL` sa Render Static Site URL-om:
  ```
  FRONTEND_URL=https://elementer-frontend.onrender.com
  ```
- Backend će se automatski restartovati

## ✅ Provera

- [ ] Static Site kreiran
- [ ] Build prošao uspešno
- [ ] Frontend dostupan na Render URL
- [ ] Backend `FRONTEND_URL` ažuriran
- [ ] Frontend može da poziva backend API

## 🐛 Troubleshooting

### Build ne uspeva:
- Proveri da li je `Root Directory` tačan (`frontend`)
- Proveri da li je `Publish Directory` tačan (`dist/frontend`)
- Proveri logove u Render Dashboard → Logs

### Frontend ne može da pozove backend:
- Proveri `apiUrl` u `environment.prod.ts`
- Proveri CORS settings u backend-u
- Proveri da li je `FRONTEND_URL` tačan u backend env varijablama

### Routing ne radi (404 na refresh):
- Render Static Site automatski podržava SPA routing
- Ako ne radi, proveri da li je `Publish Directory` tačan

---

**Sledeći korak**: Vidi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) za kompletan vodič.
