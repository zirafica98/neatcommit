# 🔴 Redis Setup Guide

Redis je potreban za BullMQ queue sistem (background jobs za code analysis).

## 🎯 Opcije za FREE Redis

### ✅ Opcija 1: Render Key Value Store (PREPORUČENO - ako koristiš Render)

**Zašto Render Key Value?**
- ✅ Besplatno
- ✅ Lako povezivanje sa Render backend-om
- ✅ Automatski setup
- ✅ Ista infrastruktura kao backend

**Koraci:**

1. **Render Dashboard** → **New** → **Key Value**
2. **Podesi**:
   - **Name**: `elementer-redis`
   - **Plan**: Free
   - **Region**: Ista kao PostgreSQL baza (npr. Frankfurt)
3. **Klikni Create Key Value Store**
4. **Sačuvaj Connection Details**:
   - Render će automatski kreirati Redis instance
   - Idi u Key Value dashboard → **Info** tab
   - Sačuvaj:
     - **Host**: `elementer-redis-xxxxx.onrender.com` ili IP
     - **Port**: `6379`
     - **Password**: Automatski generisan (vidi u dashboard-u)

**Primer**:
```
REDIS_HOST=elementer-redis-xxxxx.onrender.com
REDIS_PORT=6379
REDIS_PASSWORD=render-generated-password-here
```

---

### ✅ Opcija 2: Upstash Redis (Alternativa - besplatno zauvek)

**Zašto Upstash?**
- ✅ Besplatno zauvek
- ✅ 10,000 commands/dan (dovoljno za start)
- ✅ Serverless (plaćaš samo što koristiš)
- ✅ Lako setup
- ✅ TLS/SSL podrška

**Koraci:**

1. **Kreiraj Upstash nalog**
   - Idi na https://upstash.com
   - Sign up sa GitHub/Google

2. **Kreiraj Redis Database**
   - Dashboard → **Create Database**
   - **Name**: `elementer-redis`
   - **Type**: **Regional** (jeftinije) ili **Global** (brže)
   - **Region**: Izaberi najbližu (npr. `eu-west-1` za Evropu)
   - **Primary Region**: Ista kao backend region
   - Klikni **Create**

3. **Sačuvaj Connection Details**
   - Nakon kreiranja, vidićeš:
     - **Endpoint**: `eu-west-1-12345.upstash.io` (ovo je `REDIS_HOST`)
     - **Port**: `6379` (standardni) ili `6380` (TLS)
     - **Password**: Automatski generisan (ovo je `REDIS_PASSWORD`)
   
   **Primer**:
   ```
   REDIS_HOST=eu-west-1-12345.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Test konekcije** (opciono):
   ```bash
   # Instaliraj redis-cli ili koristi online tool
   redis-cli -h eu-west-1-12345.upstash.io -p 6379 -a YOUR_PASSWORD ping
   # Trebalo bi da vrati: PONG
   ```

---

### ✅ Opcija 2: Redis Cloud (FREE)

**Zašto Redis Cloud?**
- ✅ Besplatno 30MB storage
- ✅ Unlimited commands
- ✅ Lako setup

**Koraci:**

1. **Kreiraj Redis Cloud nalog**
   - Idi na https://redis.com/try-free/
   - Sign up

2. **Kreiraj Database**
   - Dashboard → **New Subscription** → **Free**
   - **Name**: `elementer-redis`
   - **Region**: Izaberi najbližu
   - Klikni **Activate**

3. **Sačuvaj Connection Details**
   - **Endpoint**: `redis-12345.c123.eu-west-1-1.ec2.cloud.redislabs.com`
   - **Port**: `12345`
   - **Password**: Iz dashboard-a

---

### ⚠️ Opcija 3: Render Redis (ako postoji)

Render možda nema Redis u free tier-u, ali proveri:

1. **Render Dashboard** → **New** → **Redis**
2. Ako vidiš opciju, kreiraj:
   - **Name**: `elementer-redis`
   - **Plan**: Free (ako postoji)
   - **Region**: Ista kao baza

---

## 🔧 Konfiguracija u Backend-u

Nakon što kreiraš Redis, dodaj environment varijable u Render backend:

```env
REDIS_HOST=eu-west-1-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**Za Upstash sa TLS** (preporučeno):
```env
REDIS_HOST=eu-west-1-12345.upstash.io
REDIS_PORT=6380  # TLS port
REDIS_PASSWORD=your-redis-password
```

---

## ✅ Test Konekcije

Nakon što postaviš Redis, testiraj:

```bash
# U backend folderu
cd backend

# Postavi env varijable
export REDIS_HOST=eu-west-1-12345.upstash.io
export REDIS_PORT=6379
export REDIS_PASSWORD=your-password

# Testiraj (ako imaš redis-cli)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

Ili testiraj kroz backend:
```bash
# Backend će automatski testirati Redis pri startu
npm start
# Proveri logove - trebalo bi da vidiš "✅ Redis connected successfully"
```

---

## 🐛 Troubleshooting

### "Connection refused"
- Proveri da li je `REDIS_HOST` tačan (bez `https://` i bez porta)
- Proveri da li je `REDIS_PORT` tačan (6379 ili 6380)

### "Authentication failed"
- Proveri `REDIS_PASSWORD` - mora biti tačan
- Upstash password je dugačak string

### "Host not found"
- Proveri da li je hostname tačan
- Za Upstash, format je: `region-number.upstash.io`

---

## 💡 Preporuka

**Za production**: Koristi **Upstash Redis** - najbolji free tier i lako skaliranje.

**Za development**: Možeš koristiti lokalni Redis ili Upstash.

---

**Sledeći korak**: Nakon što kreiraš Redis, nastavi sa [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → Faza 2: Backend
