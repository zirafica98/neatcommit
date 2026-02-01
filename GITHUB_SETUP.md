# 🚀 GitHub Setup Guide

## Koraci za Postavljanje na GitHub

### 1. Kreiraj GitHub Repository

1. Idi na https://github.com/new
2. Unesi ime: `elementer` (ili bilo koje drugo ime)
3. Odaberi **Private** ili **Public** (preporučeno: Private za početak)
4. **NE** kreiraj README, .gitignore ili license (već imamo)
5. Klikni "Create repository"

### 2. Poveži Lokalni Repository sa GitHub-om

```bash
cd "/Volumes/Extreme Pro/Projects/Elementer"

# Dodaj remote (zameni YOUR_USERNAME sa svojim GitHub username-om)
git remote add origin https://github.com/YOUR_USERNAME/elementer.git

# Ili ako koristiš SSH:
# git remote add origin git@github.com:YOUR_USERNAME/elementer.git
```

### 3. Commit i Push

```bash
# Proveri šta će biti commit-ovano
git status

# Ako sve izgleda dobro, commit
git commit -m "Initial commit: AI Code Review Platform

- Multi-language support (9 languages)
- Cost-optimized LLM integration
- Security pattern matching
- GitHub App integration
- Automated PR reviews"

# Push na GitHub
git branch -M main
git push -u origin main
```

### 4. Proveri da li je sve OK

1. Idi na svoj GitHub repository
2. Proveri da li su svi fajlovi tu
3. Proveri da li `.env` fajlovi **NISU** commit-ovani (ne smeju!)

---

## ⚠️ VAŽNO: Security Checklist

Pre push-a, proveri da **NISU** commit-ovani:

- ❌ `.env` fajlovi
- ❌ Private keys (`.pem`, `.key`)
- ❌ Database fajlovi
- ❌ Log fajlovi
- ❌ `node_modules/`
- ❌ `dist/` build fajlovi

**Proveri:**
```bash
git status
# Ako vidiš bilo koji od gore navedenih, dodaj u .gitignore i ukloni iz staging:
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
```

---

## 📝 Commit Message Best Practices

```bash
# Dobri commit message-i:
git commit -m "feat: Add multi-language support for Java, Python, PHP"
git commit -m "fix: Resolve SQL injection pattern detection"
git commit -m "docs: Update cost optimization documentation"
git commit -m "refactor: Optimize LLM service for cost reduction"
```

---

## 🔄 Ako već postoji Repository na GitHub-u

Ako si već kreirao repository sa README:

```bash
# Pull prvo
git pull origin main --allow-unrelated-histories

# Resolve conflicts ako ih ima, onda:
git push -u origin main
```

---

## 🔐 Private vs Public Repository

**Private (Preporučeno za start):**
- ✅ Bezbednije (ne vidi se kod)
- ✅ Možeš da testiraš
- ✅ Možeš da dodaješ collaboratore kasnije

**Public:**
- ✅ Možeš da pokažeš portfolio
- ✅ Open source projekat
- ⚠️ Svi vide kod (ali ne i .env)

---

## 📚 Sledeći Koraci

Nakon push-a:

1. ✅ Proveri da li je sve na GitHub-u
2. ✅ Dodaj GitHub Actions za CI/CD (opciono)
3. ✅ Dodaj LICENSE fajl (opciono)
4. ✅ Setup GitHub Pages za dokumentaciju (opciono)

---

**Status:** Spremno za push! 🚀
