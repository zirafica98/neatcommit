# GitHub Webhook Setup - Korak po Korak

## Šta treba da uradimo?

Podesiti GitHub App webhook da šalje evente na naš lokalni server preko ngrok-a.

---

## Korak 1: Pokrenite Backend Server

```bash
cd backend
npm run dev
```

Trebalo bi da vidite:
```
✅ Database connected
✅ Redis connected
✅ Analysis worker ready
🚀 Server running on port 3000
```

**VAŽNO:** Ostavite server pokrenut u ovom terminalu!

---

## Korak 2: Pokrenite ngrok

**U novom terminalu:**

```bash
ngrok http 3000
```

Trebalo bi da vidite:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Kopirajte HTTPS URL** (npr. `https://abc123.ngrok.io`)

**VAŽNO:** 
- Ostavite ngrok pokrenut!
- URL se menja svaki put kada restartujete ngrok (osim ako imate paid plan)

---

## Korak 3: Konfigurišite GitHub App Webhook

### 3.1. Idite na GitHub App Settings

1. Otvorite: https://github.com/settings/apps
2. Kliknite na vašu App (ili kreirajte novu ako nemate)

### 3.2. Konfigurišite Webhook

1. U sidebar-u kliknite **"Webhooks"**
2. Kliknite **"Add webhook"** (ili "Edit" ako već postoji)

### 3.3. Popunite Webhook Settings

**Webhook URL:**
```
https://abc123.ngrok.io/webhook/github
```
(Zamenite `abc123.ngrok.io` sa vašim ngrok URL-om)

**Content type:**
```
application/json
```

**Secret:**
```
[Vaš GITHUB_WEBHOOK_SECRET iz .env fajla]
```

**Which events would you like to trigger this webhook?**
Izaberite:
- ✅ **Pull requests** (opened, synchronize)
- ✅ **Installation** (created, deleted)

Ili izaberite **"Send me everything"** za testiranje.

### 3.4. Sačuvaj

Kliknite **"Add webhook"** (ili "Update webhook")

---

## Korak 4: Instalirajte App na Repository

### 4.1. Idite na App Settings

1. U sidebar-u kliknite **"Install App"**
2. Kliknite **"Install"** pored repository-ja gde želite da testirate
3. Izaberite repository-je (ili "All repositories")
4. Kliknite **"Install"**

---

## Korak 5: Testirajte - Otvorite PR

### 5.1. Kreirajte Test Repository (ako nemate)

1. Idite na GitHub
2. Kreirajte novi repository
3. Dodajte neki JavaScript/TypeScript fajl sa lošim kodom

**Primer lošeg koda (`src/auth.ts`):**
```typescript
function login(username: string, password: string) {
  // ❌ Hardcoded password
  const adminPassword = "admin123";
  
  // ❌ SQL injection
  const query = `SELECT * FROM users WHERE username = "${username}" AND password = "${password}"`;
  
  // ❌ eval() korišćenje
  const userInput = req.body.code;
  eval(userInput);
  
  return db.query(query);
}
```

### 5.2. Otvorite Pull Request

1. Kreirajte novi branch
2. Dodajte/izmenite fajl sa lošim kodom
3. Otvorite Pull Request

### 5.3. Proverite Rezultate

**U server terminalu** trebalo bi da vidite:
```
📡 info Webhook received { event: 'pull_request' }
ℹ️ info Processing PR event
⚙️ info Analysis job added to queue
👷 info Processing analysis job...
ℹ️ info Analysis results saved to database
ℹ️ info Comments posted to PR
```

**Na GitHub PR-u** trebalo bi da vidite:
- Summary komentar sa rezultatima
- Inline komentare na kritičnim linijama

---

## Troubleshooting

### Problem: "Webhook URL is not supported"

**Rešenje:**
- Proverite da li je ngrok pokrenut
- Proverite da li je URL tačan (mora biti HTTPS)
- Proverite da li je backend server pokrenut na portu 3000

### Problem: "Webhook delivery failed"

**Rešenje:**
- Proverite da li je webhook secret tačan u GitHub App settings
- Proverite server logove za greške
- Proverite ngrok dashboard: http://localhost:4040

### Problem: "No installation ID in PR event"

**Rešenje:**
- Proverite da li je App instaliran na repository-ju
- Proverite GitHub App permissions (mora imati "Pull requests: Read & Write")

### Problem: "Repository not found in database"

**Rešenje:**
- Prvo testirajte `installation.created` event
- Ili ručno dodajte repository u bazu

### Problem: ngrok URL se menja

**Rešenje:**
- Koristite ngrok paid plan za fiksni URL
- Ili ažurirajte webhook URL svaki put kada restartujete ngrok

---

## Provera Webhook Deliveries

1. Idite na GitHub App → Webhooks
2. Kliknite na webhook
3. Vidite "Recent Deliveries" - lista svih webhook eventa
4. Kliknite na delivery da vidite request/response

---

## Provera u Bazi

```bash
# Prisma Studio
npx prisma studio

# Ili API endpoint
curl http://localhost:3000/api/reviews
```

---

## Sledeći Koraci

Kada sve radi:
1. ✅ Webhook prima evente
2. ✅ Worker analizira kod
3. ✅ Rezultati se čuvaju u bazi
4. ✅ Komentari se postavljaju na PR

**Sistem je spreman za production! 🚀**
