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
   - **Publish Directory**: `dist/frontend/browser` (Angular 19 build-uje u `browser` subfolder)
   - **Plan**: Free

   **VAŽNO**: 
   - `angular.json` već ima `fileReplacements` konfigurisan da koristi `environment.prod.ts` u production build-u
   - `_redirects` fajl je već konfigurisan u `public/` folderu za SPA routing
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
- Proveri da li je `Publish Directory` tačan (`dist/frontend/browser`)
- Proveri da li `_redirects` fajl postoji u `public/` folderu sa sadržajem: `/*    /index.html   200`
- Proveri da li se `_redirects` kopira u build output (trebalo bi da bude u `dist/frontend/browser/_redirects`)

### Frontend koristi localhost umesto production URL-a:
- Proveri da li `angular.json` ima `fileReplacements` u production konfiguraciji
- Proveri da li je `environment.prod.ts` tačno konfigurisan sa production backend URL-om

---

**Sledeći korak**: Vidi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) za kompletan vodič.
