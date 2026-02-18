# 🔧 Kako Rešiti Migration Error - Duplicate Usernames

## Problem

Migracija ne može da se primeni jer u bazi postoje duplikati username-a. Na primer, korisnik "test-user" postoji više puta.

## ✅ Rešenje

### Korak 1: Reši Duplikate

Pokreni script koji će automatski rešiti duplikate:

```bash
cd backend
node scripts/fix-duplicate-usernames.js
```

Script će:
- Pronaći sve duplikate username-a
- Zadržati najstariji korisnik sa tim username-om
- Ažurirati ostale sa unique username-om (dodaje suffix: `-1`, `-2`, itd.)

### Korak 2: Proveri Rezultat

```bash
# Proveri da li ima još duplikata
node scripts/fix-duplicate-usernames.js
```

Trebalo bi da vidiš: `✅ No duplicate usernames found!`

### Korak 3: Markiraj Migraciju kao Applied (ako je već pokušana)

Ako je migracija već pokušana i failed, trebaš da je markiraš kao applied:

```bash
npx prisma migrate resolve --applied 20260216183149_add_password_and_admin_role
```

### Korak 4: Pokreni Migraciju Ponovo

```bash
npx prisma migrate dev
```

## 🔍 Alternativno: Ručno Rešenje

Ako želiš da ručno rešiš duplikate:

### 1. Pronađi Duplikate

```bash
cd backend
npx prisma studio
```

Ili kroz SQL:

```sql
SELECT username, COUNT(*) as count
FROM users
GROUP BY username
HAVING COUNT(*) > 1;
```

### 2. Ažuriraj Duplikate

```sql
-- Primer: Ažuriraj drugi "test-user" sa unique username-om
UPDATE users 
SET username = 'test-user-1' 
WHERE id = 'user-id-here' AND username = 'test-user';
```

### 3. Proveri da Nema Više Duplikata

```sql
SELECT username, COUNT(*) as count
FROM users
GROUP BY username
HAVING COUNT(*) > 1;
```

### 4. Markiraj Migraciju i Pokreni Ponovo

```bash
npx prisma migrate resolve --applied 20260216183149_add_password_and_admin_role
npx prisma migrate dev
```

## 🚨 Ako Ništa Ne Radi

Ako ništa ne radi, možeš da reset-uješ migracije (⚠️ **OPASNO - briše podatke**):

```bash
# SAMO ZA DEVELOPMENT!
npx prisma migrate reset
npx prisma migrate dev
```

**UPOZORENJE:** `migrate reset` briše sve podatke iz baze!

## 📝 Provera

Nakon što rešiš duplikate, proveri:

```bash
# Proveri da li su sve migracije primenjene
npx prisma migrate status

# Proveri da li schema odgovara bazi
npx prisma db pull
```

## ✅ Gotovo!

Nakon što rešiš duplikate i primeniš migraciju, možeš nastaviti sa kreiranjem admin korisnika.
