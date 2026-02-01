# 🔐 GitHub OAuth Setup Guide

## Problem

GitHub App i OAuth App su **različite stvari**:
- **GitHub App** - za webhook-e, instalacije, i repository access
- **OAuth App** - za user login i autentifikaciju

Za login funkcionalnost, treba nam **OAuth App**, ne GitHub App!

---

## ✅ Rešenje: Kreiraj OAuth App

### Korak 1: Kreiraj OAuth App u GitHub-u

1. Idi na: **https://github.com/settings/developers**
2. Klikni **"OAuth Apps"** u levom meniju
3. Klikni **"New OAuth App"**

### Korak 2: Popuni OAuth App informacije

**Application name:**
```
Elementer - AI Code Review
```

**Homepage URL:**
```
http://localhost:4200
```
(ili tvoj production URL)

**Authorization callback URL:**
```
http://localhost:3000/api/auth/github/callback
```
**VAŽNO:** Ovo je backend URL, ne frontend!

### Korak 3: Sačuvaj Client ID i Client Secret

Nakon kreiranja, GitHub će ti dati:
- **Client ID** - javni, možeš da ga commit-uješ
- **Client Secret** - **PRIVATAN**, nikad ne commit-uj!

---

## 🔧 Konfiguracija Backend-a

### Dodaj u `.env` fajl:

```env
# GitHub OAuth (za user login)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# GitHub App (za webhook-e i instalacije - već imaš)
GITHUB_APP_ID=2703662
GITHUB_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
```

**Napomena:** 
- `GITHUB_CLIENT_ID` i `GITHUB_CLIENT_SECRET` su za **OAuth App** (user login)
- `GITHUB_APP_ID` i `GITHUB_PRIVATE_KEY` su za **GitHub App** (webhook-e)

---

## 🧪 Testiranje

### 1. Pokreni backend:
```bash
cd backend
npm run dev
```

### 2. Pokreni frontend:
```bash
cd frontend
npm start
```

### 3. Testiraj login:
1. Otvori `http://localhost:4200`
2. Klikni **"Sign in with GitHub"**
3. Trebalo bi da te redirectuje na GitHub OAuth
4. Autorizuj aplikaciju
5. Trebalo bi da te redirectuje nazad sa tokenima

---

## 🔍 Troubleshooting

### Problem: "redirect_uri_mismatch"

**Uzrok:** Callback URL u OAuth App se ne poklapa sa onim u kodu.

**Rešenje:**
1. Proveri da li je u OAuth App settings callback URL: `http://localhost:3000/api/auth/github/callback`
2. Proveri da li je u `.env` `API_URL=http://localhost:3000`
3. Restartuj backend nakon promene `.env`

### Problem: "Invalid client"

**Uzrok:** `GITHUB_CLIENT_ID` ili `GITHUB_CLIENT_SECRET` nisu ispravni.

**Rešenje:**
1. Proveri da li su u `.env` fajlu
2. Proveri da li su kopirani bez dodatnih razmaka
3. Restartuj backend

### Problem: "This GitHub App must be configured with a callback URL"

**Uzrok:** Pokušavaš da koristiš GitHub App umesto OAuth App.

**Rešenje:**
- Kreiraj **OAuth App** (ne GitHub App) kako je objašnjeno gore
- Koristi `GITHUB_CLIENT_ID` i `GITHUB_CLIENT_SECRET` iz OAuth App-a

---

## 📝 Production Setup

Za production, promeni:

1. **OAuth App Callback URL:**
   ```
   https://api.elementer.com/api/auth/github/callback
   ```

2. **Homepage URL:**
   ```
   https://elementer.com
   ```

3. **Environment Variables:**
   ```env
   FRONTEND_URL=https://elementer.com
   API_URL=https://api.elementer.com
   ```

---

## ✅ Checklist

- [ ] OAuth App kreiran u GitHub-u
- [ ] Callback URL postavljen: `http://localhost:3000/api/auth/github/callback`
- [ ] `GITHUB_CLIENT_ID` dodat u `.env`
- [ ] `GITHUB_CLIENT_SECRET` dodat u `.env`
- [ ] Backend restartovan
- [ ] Login testiran

---

**Srećno! 🚀**
