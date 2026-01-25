# 🌍 Multi-Language Support Plan

## 🎯 Cilj

Proširiti Elementer da podržava analizu koda u više programskih jezika.

---

## 📋 Predloženi Jezici

### Prioritet 1 (Visok) - Enterprise & Web
1. **Java** - Enterprise aplikacije, Android
2. **Python** - AI/ML, web development, scripting
3. **PHP** - Web development (WordPress, Laravel)
4. **C#** - .NET ekosistem, enterprise
5. **SQL** - Database queries (važno za security)

### Prioritet 2 (Srednji) - Modern & Cloud
6. **Go** - Cloud-native, microservices
7. **Ruby** - Web development (Rails)

### Prioritet 3 (Nizak) - Dodatno
8. **Rust** - Systems programming
9. **Kotlin** - Android, JVM
10. **Swift** - iOS, macOS

---

## 🏗️ Arhitektura

### Strategija Implementacije

**Faza 1: Language Detection & Basic Analysis**
- Proširiti Language Detector
- Regex-based security pattern matching (bez AST-a)
- LLM analiza radi za sve jezike

**Faza 2: AST Parsing (Opciono)**
- Dodati AST parser-e za svaki jezik
- Koristiti tree-sitter ili jezik-specifične parser-e
- Poboljšati Security Service sa AST analizom

---

## 📦 Potrebne Biblioteke

### Opcija 1: Tree-sitter (Univerzalni Parser)
```bash
npm install tree-sitter tree-sitter-java tree-sitter-python tree-sitter-php tree-sitter-c-sharp tree-sitter-sql tree-sitter-go tree-sitter-ruby
```

**Prednosti:**
- Jedinstveni API za sve jezike
- Brz i efikasan
- Dobra podrška

**Mane:**
- Veći bundle size
- Kompleksnija integracija

### Opcija 2: Jezik-Specifični Parseri
- Java: `java-parser` ili `@babel/parser` (ne podržava Java)
- Python: `@babel/parser` (ne podržava Python) ili `tree-sitter-python`
- PHP: `php-parser` ili `tree-sitter-php`
- C#: `csharp-parser` ili `tree-sitter-c-sharp`
- SQL: `node-sql-parser` ili `tree-sitter-sql`
- Go: `tree-sitter-go`
- Ruby: `tree-sitter-ruby`

**Prednosti:**
- Manji bundle size
- Možemo birati najbolji parser za svaki jezik

**Mane:**
- Različiti API-ji
- Više koda za održavanje

### Preporuka: **Tree-sitter** (Opcija 1)

Tree-sitter je najbolji izbor jer:
- Jedinstveni API
- Dobra performansa
- Aktivno održavanje
- Podrška za sve jezike koje želimo

---

## 🔧 Implementacija

### Korak 1: Proširiti Language Detector

Dodati nove jezike u `EXTENSION_TO_LANGUAGE` mapu.

### Korak 2: Kreirati AST Parser Adapter

Adapter pattern koji koristi odgovarajući parser za svaki jezik.

### Korak 3: Proširiti Security Service

Dodati jezik-specifične security pattern-e.

### Korak 4: Testiranje

Testirati analizu za svaki novi jezik.

---

## 📊 Security Pattern-i po Jeziku

### Java
- SQL Injection (PreparedStatement vs String concatenation)
- XSS (JSP, servlets)
- Deserialization vulnerabilities
- Hardcoded secrets

### Python
- SQL Injection (raw queries)
- Command Injection (os.system, subprocess)
- Pickle deserialization
- Hardcoded secrets

### PHP
- SQL Injection (mysql_query, mysqli)
- XSS (echo, print)
- File inclusion vulnerabilities
- Hardcoded secrets

### C#
- SQL Injection (String.Format, concatenation)
- XSS (Response.Write)
- Deserialization (BinaryFormatter)
- Hardcoded secrets

### SQL
- SQL Injection patterns
- Missing WHERE clauses
- Unescaped user input
- Privilege escalation

### Go
- SQL Injection
- Command Injection
- Hardcoded secrets
- Unsafe pointer usage

### Ruby
- SQL Injection (ActiveRecord)
- XSS (ERB templates)
- Command Injection (system, exec)
- Hardcoded secrets

---

## 🚀 Plan Implementacije

### Faza 1: Language Detection (1-2h)
- [x] Proširiti Language Detector
- [ ] Testirati detekciju

### Faza 2: Basic Security Analysis (2-3h)
- [ ] Dodati regex pattern-e za svaki jezik
- [ ] Testirati security analizu

### Faza 3: AST Parsing (4-6h)
- [ ] Instalirati tree-sitter
- [ ] Kreirati AST parser adapter
- [ ] Integrisati sa Analysis Service

### Faza 4: Testing & Polish (2-3h)
- [ ] Testirati svaki jezik
- [ ] Optimizovati performanse
- [ ] Dokumentacija

**Ukupno vreme:** ~10-14h

---

## 📝 Napomene

1. **LLM Service** već radi sa bilo kojim jezikom - samo šalje kod u prompt
2. **AST Parsing** je opciono - regex pattern matching može biti dovoljno za početak
3. **Performance** - tree-sitter je brz, ali možemo dodati caching
4. **Error Handling** - ako parser padne, fallback na regex analizu

---

**Status:** Plan kreiran, spremno za implementaciju
