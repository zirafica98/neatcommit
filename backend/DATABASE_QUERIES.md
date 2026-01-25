# Kako proveriti podatke u bazi

## Opcija 1: Prisma Studio (Najlakše) ⭐

**Prisma Studio** je web UI za pregled i editovanje podataka u bazi.

### Pokretanje:
```bash
cd backend
npx prisma studio
```

Otvoriće se browser na `http://localhost:5555`

### Šta možeš:
- ✅ Pregled svih tabela (User, Installation, Repository, Review, Issue, ReviewComment)
- ✅ Pretraga i filtriranje
- ✅ Editovanje podataka
- ✅ Dodavanje novih redova
- ✅ Brisanje podataka

---

## Opcija 2: SQL direktno (PostgreSQL)

### Povezivanje:
```bash
# Preko Docker
docker exec -it elementer-postgres psql -U elementer -d elementer

# Ili direktno (ako imaš psql instaliran)
psql postgresql://elementer:elementer@localhost:5432/elementer
```

### Korisni upiti:

**Pregled svih tabela:**
```sql
\dt
```

**Pregled svih reviews:**
```sql
SELECT * FROM reviews ORDER BY "createdAt" DESC LIMIT 10;
```

**Pregled svih issues:**
```sql
SELECT 
  i.*,
  r."githubPrNumber",
  r."githubPrTitle"
FROM issues i
JOIN reviews r ON i."reviewId" = r.id
ORDER BY i."createdAt" DESC
LIMIT 20;
```

**Broj issues po severity:**
```sql
SELECT 
  severity,
  COUNT(*) as count
FROM issues
GROUP BY severity
ORDER BY 
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    WHEN 'INFO' THEN 5
  END;
```

**Reviews sa najviše issues:**
```sql
SELECT 
  r."githubPrTitle",
  r."githubPrNumber",
  r."securityScore",
  r."totalIssues",
  r."criticalIssues",
  r."highIssues",
  r.status,
  r."createdAt"
FROM reviews r
ORDER BY r."totalIssues" DESC
LIMIT 10;
```

**Pregled installations:**
```sql
SELECT * FROM installations;
```

**Pregled repositories:**
```sql
SELECT * FROM repositories;
```

---

## Opcija 3: API Endpoint (Za programski pristup)

Možemo kreirati endpoint koji vraća podatke iz baze.

### Primer endpoint-a:
```typescript
// GET /api/reviews - Lista svih reviews
// GET /api/reviews/:id - Detalji review-a
// GET /api/issues - Lista svih issues
```

---

## Opcija 4: Redis (Queue podaci)

### Pregled queue podataka:
```bash
docker exec -it elementer-redis redis-cli

# Pregled svih ključeva
KEYS *

# Pregled queue job-ova
KEYS "bull:code-analysis:*"

# Pregled completed job-ova
LLEN bull:code-analysis:completed

# Pregled failed job-ova
LLEN bull:code-analysis:failed
```

---

## Najbrži način: Prisma Studio

```bash
cd backend
npx prisma studio
```

Otvori browser i vidi sve podatke vizuelno! 🎨
