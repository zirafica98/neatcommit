# 🔐 Kako Postaviti Admin Korisnika

Ovaj vodič će ti pomoći da postaviš admin korisnika u bazi podataka.

## 📋 Opcija 1: Kroz Prisma Studio (Najlakše)

### 1. Pokreni Prisma Studio

```bash
cd backend
npx prisma studio
```

### 2. Otvori Prisma Studio u browser-u

- Otvori: `http://localhost:5555`
- Klikni na **"User"** model
- Pronađi korisnika koga želiš da postaviš kao admina
- Klikni na korisnika da ga otvoriš
- Promeni **"role"** polje sa `USER` na `ADMIN`
- Klikni **"Save changes"**

## 📋 Opcija 2: Kroz SQL Query (Direktno u bazi)

### 1. Konektuj se na bazu

Ako koristiš PostgreSQL lokalno:

```bash
psql -U your-username -d your-database-name
```

Ili ako koristiš Render/Heroku database:

```bash
# Render
psql "postgresql://user:password@host:port/database"

# Heroku
heroku pg:psql
```

### 2. Pronađi korisnika

```sql
SELECT id, username, email, role FROM users;
```

### 3. Postavi admin role

```sql
-- Postavi specifičnog korisnika kao admina
UPDATE users SET role = 'ADMIN' WHERE username = 'username-koji-zelis';

-- Ili po email-u
UPDATE users SET role = 'ADMIN' WHERE email = 'email@example.com';

-- Ili po ID-u
UPDATE users SET role = 'ADMIN' WHERE id = 'user-id-here';
```

### 4. Proveri da li je uspešno

```sql
SELECT id, username, email, role FROM users WHERE role = 'ADMIN';
```

## 📋 Opcija 3: Kroz Node.js Script

Kreiraj fajl `backend/scripts/set-admin.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAdmin() {
  const username = process.argv[2]; // Username iz command line
  
  if (!username) {
    console.error('Usage: node set-admin.js <username>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { username },
      data: { role: 'ADMIN' },
    });

    console.log(`✅ User ${user.username} is now an ADMIN`);
  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ User "${username}" not found`);
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
```

Pokreni:

```bash
cd backend
node scripts/set-admin.js username-koji-zelis
```

## 📋 Opcija 4: Kroz Prisma Migrate (Za novog korisnika)

Ako želiš da kreiraš novog admin korisnika direktno u bazi:

```sql
INSERT INTO users (id, "githubId", username, email, role, "createdAt", "updatedAt")
VALUES (
  'admin-id-here',
  123456, -- GitHub ID (može biti bilo koji unique broj)
  'admin-username',
  'admin@example.com',
  'ADMIN',
  NOW(),
  NOW()
);
```

**VAŽNO:** Ovo će kreirati korisnika, ali neće moći da se loguje kroz GitHub OAuth jer nema validan GitHub account. Bolje je koristiti postojećeg korisnika.

## ✅ Provera

Nakon što postaviš admin role:

1. **Logout** iz aplikacije (ako si već ulogovan)
2. **Login ponovo** kroz GitHub OAuth
3. Proveri da li vidiš **"Admin"** link u navigaciji
4. Idi na `/admin` rutu

## 🔍 Troubleshooting

### Problem: Ne vidim "Admin" link

**Rešenje:**
1. Proveri da li je korisnik stvarno admin u bazi:
   ```sql
   SELECT username, role FROM users WHERE username = 'your-username';
   ```
2. Logout i login ponovo (da se refresh-uje token)
3. Proveri da li `/api/auth/me` vraća `role: 'ADMIN'`

### Problem: Ne mogu da pristupim /admin ruti

**Rešenje:**
1. Proveri browser console za greške
2. Proveri da li je `adminGuard` ispravno konfigurisan
3. Proveri da li je korisnik admin u bazi

### Problem: Prisma Studio ne radi

**Rešenje:**
1. Proveri da li je `DATABASE_URL` postavljen u `.env`
2. Proveri da li je baza dostupna
3. Pokušaj sa SQL direktno

## 📝 Napomena o Login-u

**Trenutno sistem koristi samo GitHub OAuth za login.** 

Ako želiš da se loguješ sa username/password-om umesto GitHub OAuth-a, to zahteva:
1. Dodavanje `password` polja u User model
2. Kreiranje password-based auth endpoint-a
3. Ažuriranje login komponente

Ako želiš, mogu da implementiram password-based login sistem.
