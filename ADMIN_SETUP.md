# 🔐 Admin Setup - Password-Based Login

Ovaj vodič će ti pomoći da kreiraš admin korisnika sa password-based login-om.

## 📋 Koraci

### 1. Instaliraj Dependencies

```bash
cd backend
npm install
```

Ovo će instalirati `bcrypt` i `@types/bcrypt`.

### 2. Kreiraj Migraciju

```bash
cd backend
npx prisma migrate dev --name add_password_and_admin_role
```

Ovo će:
- Dodati `password` polje u User model
- Napraviti `githubId` opcionim
- Dodati `role` polje
- Kreirati potrebne indexe

### 3. Registruj Admin Korisnika

#### Opcija A: Kroz Frontend (Najlakše)

1. Pokreni frontend:
   ```bash
   cd frontend
   npm start
   ```

2. Otvori: `http://localhost:4200/auth/login`

3. Klikni **"Register"**

4. Popuni formu:
   - **Username**: `admin` (ili bilo koji username)
   - **Email**: `admin@example.com`
   - **Name**: `Admin User` (opciono)
   - **Password**: Jaka lozinka (min 8 karaktera, velika/mala slova, broj)

5. Klikni **"Register"**

6. Login sa tim credentials-ima

#### Opcija B: Kroz Backend Script

Kreiraj fajl `backend/scripts/create-admin.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@example.com';
  const password = process.argv[4] || 'Admin123!';

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kreiraj admin korisnika
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Admin User',
      },
    });

    console.log(`✅ Admin user created:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.error(`❌ User with username "${username}" or email "${email}" already exists`);
    } else {
      console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
```

Pokreni:

```bash
cd backend
node scripts/create-admin.js admin admin@example.com Admin123!
```

### 4. Postavi Admin Role (ako već imaš korisnika)

Ako si već registrovao korisnika i želiš da ga postaviš kao admina:

```bash
cd backend
npm run set-admin username-koji-zelis
```

Ili kroz Prisma Studio:

```bash
npx prisma studio
```

- Otvori User model
- Pronađi korisnika
- Promeni `role` na `ADMIN`

### 5. Login kao Admin

1. Otvori: `http://localhost:4200/auth/login`

2. Unesi:
   - **Username or Email**: `admin` (ili email)
   - **Password**: Tvoja lozinka

3. Klikni **"Login"**

4. Trebalo bi da vidiš **"Admin"** link u navigaciji

5. Idi na `/admin` rutu

## ✅ Provera

### Proveri da li je admin korisnik kreiran:

```bash
cd backend
npx prisma studio
```

- Otvori User model
- Proveri da li postoji korisnik sa `role: 'ADMIN'`
- Proveri da li ima `password` polje (hash-ovano)

### Proveri da li možeš da se loguješ:

1. Idi na login stranicu
2. Unesi username/password
3. Trebalo bi da se uloguješ i vidiš admin link

## 🔍 Troubleshooting

### Problem: "User with this username or email already exists"

**Rešenje:**
- Korisnik već postoji - koristi drugi username/email
- Ili postavi postojećeg korisnika kao admina:
  ```bash
  npm run set-admin existing-username
  ```

### Problem: "Invalid username or password"

**Rešenje:**
1. Proveri da li korisnik postoji u bazi
2. Proveri da li ima `password` polje (ne GitHub OAuth korisnik)
3. Proveri da li je password tačan

### Problem: Ne vidim "Admin" link

**Rešenje:**
1. Proveri da li je korisnik admin u bazi:
   ```sql
   SELECT username, role FROM users WHERE username = 'your-username';
   ```
2. Logout i login ponovo
3. Proveri da li `/api/auth/me` vraća `role: 'ADMIN'`

### Problem: Migracija ne radi

**Rešenje:**
1. Proveri da li je `DATABASE_URL` postavljen u `.env`
2. Proveri da li je baza dostupna
3. Pokušaj:
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev
   ```

## 📝 Napomene

- **Password-based korisnici** ne moraju imati GitHub account
- **GitHub OAuth korisnici** ne mogu koristiti password login
- **Admin korisnici** mogu biti i password-based i GitHub OAuth (ali preporučeno password-based)
- **Password strength**: Min 8 karaktera, velika/mala slova, broj

## 🎉 Gotovo!

Sada imaš password-based login sistem i možeš kreirati admin korisnika bez GitHub-a!
