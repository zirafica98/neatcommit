# Webhook Testing Guide

## Opcija 1: Testiranje sa ngrok (Real GitHub Webhooks)

### 1. Pokrenite backend server
```bash
cd backend
npm run dev
```

### 2. Pokrenite ngrok u novom terminalu
```bash
ngrok http 3000
```

### 3. Kopirajte ngrok URL
ngrok će prikazati nešto kao:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Konfigurišite GitHub App Webhook
1. Idite na GitHub App settings: https://github.com/settings/apps
2. Izaberite vašu App
3. Idite na "Webhooks" sekciju
4. Kliknite "Add webhook"
5. **Webhook URL**: `https://abc123.ngrok.io/webhook/github`
6. **Content type**: `application/json`
7. **Secret**: Vaš `GITHUB_WEBHOOK_SECRET` iz `.env` fajla
8. **Events**: Izaberite:
   - `pull_request` (opened, synchronize)
   - `installation` (created, deleted)

### 5. Testirajte
- Otvorite PR u repozitorijumu gde je App instaliran
- Proverite server logove - trebalo bi da vidite webhook event

---

## Opcija 2: Lokalno testiranje (Simulacija)

### Test Pull Request Event

```bash
curl -X POST http://localhost:3000/test/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "pull_request",
    "payload": {
      "action": "opened",
      "installation": {
        "id": 123456
      },
      "repository": {
        "id": 789012,
        "name": "test-repo",
        "full_name": "test-owner/test-repo",
        "owner": {
          "login": "test-owner"
        },
        "default_branch": "main"
      },
      "pull_request": {
        "id": 345678,
        "number": 1,
        "title": "Test PR",
        "state": "open",
        "html_url": "https://github.com/test-owner/test-repo/pull/1",
        "head": {
          "sha": "abc123def456"
        },
        "owner": {
          "login": "test-owner"
        },
        "repo": {
          "name": "test-repo"
        }
      }
    }
  }'
```

### Test Installation Event

```bash
curl -X POST http://localhost:3000/test/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "installation",
    "payload": {
      "action": "created",
      "installation": {
        "id": 123456,
        "account": {
          "id": 111222,
          "login": "test-user",
          "type": "User"
        },
        "target_type": "User",
        "repositories": [
          {
            "id": 789012,
            "name": "test-repo",
            "full_name": "test-owner/test-repo",
            "private": false,
            "default_branch": "main",
            "owner": {
              "login": "test-owner"
            }
          }
        ]
      },
      "sender": {
        "id": 111222,
        "login": "test-user",
        "email": "test@example.com",
        "avatar_url": "https://github.com/avatars/test-user",
        "name": "Test User"
      }
    }
  }'
```

---

## Provera rezultata

### 1. Proverite server logove
Trebalo bi da vidite:
```
Webhook received { event: 'pull_request', deliveryId: '...' }
Processing PR event { action: 'opened', ... }
Analysis job added to queue
```

### 2. Proverite bazu podataka
```bash
npx prisma studio
```

Trebalo bi da vidite:
- **Review** entry sa PR podacima
- **Installation** entry (ako ste testirali installation event)

### 3. Proverite queue
```bash
docker exec elementer-redis redis-cli KEYS "bull:code-analysis:*"
```

Trebalo bi da vidite job-ove u queue-u.

---

## Troubleshooting

### Problem: "Missing webhook signature"
**Rešenje:** Test endpoint automatski dodaje mock signature, ali za real webhook-e potrebno je da GitHub App ima pravilno podešen secret.

### Problem: "Repository not found in database"
**Rešenje:** Prvo testirajte `installation.created` event da se repository sačuva u bazi.

### Problem: ngrok ne radi
**Rešenje:** 
- Proverite da li je ngrok pokrenut: `ngrok http 3000`
- Proverite da li je backend server pokrenut na portu 3000
- Proverite ngrok dashboard: http://localhost:4040

---

## Sledeći koraci

Nakon što webhook radi:
1. ✅ Webhook prima evente
2. ✅ Sačuva podatke u bazi
3. ✅ Dodaje job u queue
4. ⏭️ Worker procesira job (sledeći korak - code analysis)
