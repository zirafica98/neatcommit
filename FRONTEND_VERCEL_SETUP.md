# 🟡 Frontend Deployment - Vercel

Brzi vodič za deployovanje Angular frontend-a na Vercel.

## ✅ Prednosti Vercel

- ✅ Besplatno zauvek
- ✅ Ne "spava" kao Heroku
- ✅ Brže učitavanje (Edge Network)
- ✅ Automatski HTTPS
- ✅ Automatski SPA routing support (ne treba `_redirects`)
- ✅ Automatski build optimizacija
- ✅ Preview deployments za svaki PR

## 📋 Preduslovi

- ✅ Backend već radi (Render ili drugi hosting)
- ✅ GitHub repo sa frontend kodom
- ✅ Vercel nalog (besplatno - sign up sa GitHub)

## 📋 Koraci

### 1. Ažuriraj `environment.prod.ts`

Pre deploy-a, ažuriraj backend URL:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://neatcommit.onrender.com', // AŽURIRAJ sa Render backend URL-om
  githubAppName: 'neatcommit', // AŽURIRAJ sa GitHub App name-om
};
```

**VAŽNO**: Ažuriraj `apiUrl` sa tačnim backend URL-om!

### 2. Kreiraj Vercel Account

1. Idi na https://vercel.com
2. Klikni **Sign Up**
3. Izaberi **Continue with GitHub**
4. Autorizuj Vercel da pristupa tvojim repozitorijumima

### 3. Deploy na Vercel

#### Opcija A: Preko Vercel Dashboard (Preporučeno)

1. **Vercel Dashboard** → **Add New** → **Project**
2. **Import Git Repository**: Izaberi GitHub repo
3. **Configure Project**:
   - **Framework Preset**: Angular (automatski detektuje)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (ili `npm install && npm run build`)
   - **Output Directory**: `dist/frontend/browser` (Angular 19 build-uje u `browser` subfolder)
   - **Install Command**: `npm install`
4. Klikni **Deploy**

#### Opcija B: Preko Vercel CLI

```bash
# 1. Instaliraj Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd frontend
vercel

# 4. Prati uputstva:
# - Set up and deploy? Y
# - Which scope? (izaberi svoj account)
# - Link to existing project? N
# - Project name? elementer-frontend
# - Directory? ./
# - Override settings? N
```

### 4. Vercel će automatski

- Build-ovati Angular aplikaciju
- Deploy-ovati na Edge Network
- Dodeliti URL (npr. `https://elementer-frontend.vercel.app`)
- Omogućiti automatski SPA routing (sve rute idu na `index.html`)

### 5. Ažuriraj Backend `FRONTEND_URL`

- Idi na **Render Dashboard** → **Backend Web Service** → **Environment**
- Ažuriraj `FRONTEND_URL` sa Vercel URL-om:
  ```
  FRONTEND_URL=https://elementer-frontend.vercel.app
  ```
- Backend će se automatski restartovati

### 6. (Opciono) Custom Domain

1. **Vercel Dashboard** → **Project** → **Settings** → **Domains**
2. Dodaj svoj domen (npr. `app.elementer.com`)
3. Dodaj DNS records kako Vercel kaže
4. Ažuriraj `FRONTEND_URL` u backend-u sa novim domenom

## ✅ Provera

- [ ] Vercel account kreiran
- [ ] Project deploy-ovan
- [ ] `environment.prod.ts` ažuriran sa backend URL-om
- [ ] Build prošao uspešno
- [ ] Frontend dostupan na Vercel URL
- [ ] Backend `FRONTEND_URL` ažuriran
- [ ] Frontend može da poziva backend API
- [ ] SPA routing radi (možeš refresh-ovati bilo koju rutu)

## 🐛 Troubleshooting

### Build ne uspeva:
- Proveri da li je `Root Directory` tačan (`frontend`)
- Proveri da li je `Output Directory` tačan (`dist/frontend/browser`)
- Proveri logove u Vercel Dashboard → Deployments → [Latest] → Build Logs

### Frontend ne može da pozove backend:
- Proveri `apiUrl` u `environment.prod.ts`
- Proveri CORS settings u backend-u
- Proveri da li je `FRONTEND_URL` tačan u backend env varijablama

### Routing ne radi (404 na refresh):
- **Vercel automatski podržava SPA routing** - ne treba `_redirects` fajl
- Ako i dalje ne radi, proveri da li je `Output Directory` tačan (`dist/frontend/browser`)
- Proveri da li Angular router koristi `useHash: false` (default)

### Frontend koristi localhost umesto production URL-a:
- Proveri da li `angular.json` ima `fileReplacements` u production konfiguraciji
- Proveri da li je `environment.prod.ts` tačno konfigurisan sa production backend URL-om
- Proveri da li se koristi production build (Vercel automatski koristi production)

### 🔐 GitHub login: "Instaliraj app na repozitorijima" i onda ništa se ne desi

Ako pri loginu preko GitHub-a vidiš ekran za **instalaciju app-a na repozitorijima**, a posle toga te ne vrati u aplikaciju, proveri sledeće:

#### 1. Koristi OAuth App za login (ne GitHub App Client ID)

- **OAuth App** = korisnik vidi "Authorize [App] to access your account" (jedan klik).
- **GitHub App** Client ID = GitHub može da prikaže "Install on repositories" umesto obične autorizacije.

**Šta uraditi:** Kreiraj **poseban OAuth App** samo za login:
1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. **Authorization callback URL** mora biti: `https://NEATCOMMIT-BACKEND-URL/api/auth/github/callback` (npr. `https://neatcommit.onrender.com/api/auth/github/callback`)
3. U backend env na Render-u koristi **taj** OAuth App: `GITHUB_CLIENT_ID` i `GITHUB_CLIENT_SECRET` iz OAuth App-a, ne iz GitHub App-a.

#### 2. GitHub OAuth App – Callback URL za production

U GitHubu, u **OAuth App** (ne GitHub App) podesi:
- **Authorization callback URL**: `https://neatcommit.onrender.com/api/auth/github/callback` (tačan backend URL, bez trailing slash)

Ako ostane `http://localhost:3000/...`, posle autorizacije GitHub prebacuje na localhost i izgleda da "ništa ne radi".

#### 3. GitHub App – Setup URL (nakon instalacije na repoe)

Kada korisnik **instalira** GitHub App na repozitorijume, GitHub ga redirektuje na **Setup URL** tvoje GitHub App.
- U GitHubu: **Settings** → **Developer settings** → **GitHub Apps** → tvoja app → **General**
- Polje **Setup URL** (ili "Callback URL" / "Redirect URL after installation") postavi na:  
  `https://neatcommit.onrender.com/api/auth/github/callback`

Bez ovoga, posle klika "Install" korisnik ostaje na GitHubu ili dobija pogrešan URL i ne vraća se u tvoju app.

#### 4. Backend (Render) – FRONTEND_URL

Na Render-u, u Environment varijablama backend servisa:
- `FRONTEND_URL` = tvoj Vercel URL, npr. `https://tvoj-projekat.vercel.app`
- `API_URL` = backend URL, npr. `https://neatcommit.onrender.com`

Posle uspešnog logina ili instalacije, backend šalje redirect na `FRONTEND_URL/auth/callback`. Ako je `FRONTEND_URL` ostao `http://localhost:4200`, korisnik se "vrati" na localhost i izgleda da se ništa ne desi.

#### 5. Kratka provera liste

- [ ] OAuth App kreiran (za login), callback = `https://TVOJ-BACKEND/api/auth/github/callback`
- [ ] GitHub App – Setup URL = `https://TVOJ-BACKEND/api/auth/github/callback`
- [ ] Render: `FRONTEND_URL` = Vercel URL, `API_URL` = backend URL
- [ ] Render: `GITHUB_CLIENT_ID` i `GITHUB_CLIENT_SECRET` iz **OAuth App**, ne iz GitHub App

Detaljnije: [GITHUB_OAUTH_SETUP.md](./GITHUB_OAUTH_SETUP.md) i [GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md).

## 🔄 Automatski Deploy

Vercel automatski deploy-uje kada push-uješ na:
- **Production**: `main` ili `master` branch
- **Preview**: Bilo koji drugi branch ili PR

Možeš onemogućiti automatski deploy u **Settings** → **Git** ako želiš.

## 📊 Analytics (Opciono)

Vercel nudi besplatne analytics:
1. **Dashboard** → **Project** → **Analytics**
2. Omogući **Web Analytics** (besplatno)
3. Vidi metrics za performance, page views, itd.

---

**Sledeći korak**: Vidi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) za kompletan vodič.
