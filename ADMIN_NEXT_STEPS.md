# 🎯 Admin Setup - Sledeći Koraci

Sada kada je migracija primenjena, evo šta treba da uradiš:

## ✅ Korak 1: Kreiraj Admin Korisnika

### Opcija A: Kroz Script (Najlakše)

```bash
cd backend
npm run create-admin admin admin@example.com Admin123!
```

Ovo će kreirati admin korisnika sa:
- **Username**: `admin`
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Role**: `ADMIN`

### Opcija B: Kroz Frontend

1. Pokreni frontend:
   ```bash
   cd frontend
   npm start
   ```

2. Otvori: `http://localhost:4200/auth/login`

3. Klikni **"Register"**

4. Popuni formu:
   - **Username**: `admin` (ili bilo koji)
   - **Email**: `admin@example.com`
   - **Name**: `Admin User` (opciono)
   - **Password**: Jaka lozinka (min 8 karaktera, velika/mala slova, broj)

5. Klikni **"Register"**

6. Zatim postavi kao admin:
   ```bash
   cd backend
   npm run set-admin admin
   ```

## ✅ Korak 2: Login kao Admin

1. Idi na: `http://localhost:4200/auth/login`

2. Unesi:
   - **Username or Email**: `admin` (ili email)
   - **Password**: Tvoja lozinka

3. Klikni **"Login"**

4. Trebalo bi da vidiš **"Admin"** link u navigaciji (levo)

## ✅ Korak 3: Testiraj Admin Panel

1. Klikni na **"Admin"** link u navigaciji

2. Trebalo bi da vidiš admin dashboard sa:
   - **Revenue** statistike
   - **Users** statistike
   - **Subscriptions** statistike
   - **Reviews** statistike
   - **Repositories** statistike
   - **Users Table** sa listom svih korisnika

## ✅ Korak 4: Proveri Backend

Proveri da li backend radi:

```bash
cd backend
npm run dev
```

Testiraj admin endpoint:

```bash
# U drugom terminalu
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/admin/stats
```

## 🔍 Troubleshooting

### Problem: Ne vidim "Admin" link

**Rešenje:**
1. Proveri da li je korisnik admin u bazi:
   ```bash
   npx prisma studio
   # Proveri User model -> role treba da bude "ADMIN"
   ```

2. Logout i login ponovo

3. Proveri browser console za greške

### Problem: "Forbidden: Admin access required"

**Rešenje:**
1. Proveri da li je korisnik stvarno admin:
   ```bash
   npm run set-admin username
   ```

2. Proveri da li token sadrži role:
   - Otvori browser DevTools -> Application -> Local Storage
   - Proveri `access_token`
   - Dekodiraj JWT token (možeš koristiti jwt.io)
   - Proveri da li `role` field postoji i da je `"ADMIN"`

### Problem: Login ne radi

**Rešenje:**
1. Proveri da li backend radi
2. Proveri browser console za greške
3. Proveri network tab u DevTools
4. Proveri da li je korisnik kreiran u bazi

## 📝 Checklist

- [ ] Admin korisnik kreiran
- [ ] Login sa username/password radi
- [ ] "Admin" link se prikazuje u navigaciji
- [ ] Admin dashboard se učitava
- [ ] Statistike se prikazuju
- [ ] Users tabela se prikazuje

## 🎉 Gotovo!

Sada imaš potpuno funkcionalan admin panel sa password-based login-om!
