# Code Analysis Engine - Objašnjenje

## Šta smo danas napravili?

Kreirali smo **Code Analysis Engine** - sistem koji automatski analizira kod i pronalazi probleme. Evo šta smo uradili:

---

## 1. Language Detector (`src/utils/language-detector.ts`)

### Šta radi?
Detektuje programski jezik po ekstenziji fajla.

### Primer u praksi:
```typescript
detectLanguage("src/index.ts") 
// → { language: "typescript", extension: ".ts", isSupported: true }

detectLanguage("app.jsx")
// → { language: "javascript", extension: ".jsx", isSupported: true }

detectLanguage("config.yaml")
// → { language: "unknown", extension: ".yaml", isSupported: false }
```

### Zašto nam treba?
- Zna da li možemo da analiziramo fajl (samo JS/TS za sada)
- Omogućava da kasnije dodamo podršku za druge jezike
- Pomaže da odaberemo pravi parser

---

## 2. AST Parser (`src/utils/ast-parser.ts`)

### Šta radi?
Parsira JavaScript/TypeScript kod u **AST (Abstract Syntax Tree)** i ekstraktuje strukturu koda.

### Primer u praksi:

**Input kod:**
```typescript
function calculateTotal(items: Item[]) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

class ShoppingCart {
  items: Item[] = [];
  
  addItem(item: Item) {
    this.items.push(item);
  }
}
```

**Output struktura:**
```typescript
{
  functions: [
    {
      name: "calculateTotal",
      line: 1,
      params: ["items"],
      isAsync: false,
      complexity: 2  // for loop dodaje kompleksnost
    }
  ],
  classes: [
    {
      name: "ShoppingCart",
      line: 9,
      methods: ["addItem"]
    }
  ],
  variables: [
    { name: "total", line: 2, type: "let" }
  ],
  complexity: 2
}
```

### Zašto nam treba?
- **Razume strukturu koda** - zna gde su funkcije, klase, varijable
- **Meri kompleksnost** - viša kompleksnost = više šanse za greške
- **Pomaže AI analizi** - daje kontekst AI-u šta kod radi
- **Detektuje probleme** - može da vidi loše pattern-e u strukturi

---

## 3. Security Service (`src/services/security.service.ts`)

### Šta radi?
Proverava kod za **osnovne security probleme** - poznate vulnerabilnosti.

### Primer u praksi:

**Input kod sa problemom:**
```javascript
// ❌ LOŠE
const password = "admin123";
const query = `SELECT * FROM users WHERE id = ${userId}`;
eval(userInput);
```

**Output - nađeni problemi:**
```typescript
[
  {
    severity: "CRITICAL",
    category: "SECURITY",
    title: "Hardcoded Password",
    description: "Hardcoded secret detected...",
    line: 1,
    suggestedFix: "Move secret to environment variable",
    cweId: "CWE-798",
    owaspCategory: "A07:2021 – Identification and Authentication Failures"
  },
  {
    severity: "HIGH",
    category: "SECURITY",
    title: "Potential SQL Injection",
    description: "SQL query contains user input...",
    line: 2,
    suggestedFix: "Use parameterized queries"
  },
  {
    severity: "CRITICAL",
    category: "SECURITY",
    title: "Use of eval()",
    description: "eval() can execute arbitrary code...",
    line: 3,
    suggestedFix: "Use JSON.parse() instead"
  }
]
```

### Šta proverava?
- ✅ Hardcoded secrets (passwords, API keys)
- ✅ SQL injection
- ✅ XSS (Cross-Site Scripting)
- ✅ Insecure random number generation
- ✅ eval() korišćenje
- ✅ Insecure HTTP konekcije
- ✅ Weak cryptographic algoritme (MD5, SHA1)
- ✅ Opasne funkcije (exec, system)

### Zašto nam treba?
- **Brzo pronalazi poznate probleme** - ne mora AI za ovo
- **OWASP Top 10 checks** - standardni security checklist
- **CWE patterns** - Common Weakness Enumeration
- **Automatski** - radi bez ljudske intervencije

---

## 4. LLM Service (`src/services/llm.service.ts`)

### Šta radi?
Koristi **OpenAI GPT-4** da analizira kod i daje **AI-powered code review**.

### Primer u praksi:

**Input:**
```typescript
// Kod koji analiziramo
function processPayment(amount: number, userId: string) {
  const total = amount * 1.2; // 20% tax
  saveToDatabase(total, userId);
  return total;
}
```

**AI analiza:**
```typescript
{
  summary: "Function calculates payment with tax but lacks error handling and validation",
  issues: [
    {
      severity: "MEDIUM",
      category: "QUALITY",
      title: "Missing Input Validation",
      description: "Function doesn't validate amount or userId before processing",
      line: 1,
      suggestedFix: "Add validation: if (amount <= 0 || !userId) throw new Error(...)",
      explanation: "Invalid input could cause errors or security issues"
    },
    {
      severity: "LOW",
      category: "MAINTAINABILITY",
      title: "Magic Number",
      description: "Tax rate 1.2 is hardcoded",
      line: 2,
      suggestedFix: "Extract to constant: const TAX_RATE = 1.2"
    }
  ],
  suggestions: [
    "Add error handling for database operations",
    "Consider using Decimal.js for financial calculations",
    "Add logging for payment processing"
  ],
  score: 65  // 65/100 - ima prostora za poboljšanje
}
```

### Zašto nam treba?
- **Inteligentna analiza** - AI vidi probleme koje pattern matching ne vidi
- **Kontekstualno razumevanje** - razume šta kod pokušava da uradi
- **Best practices** - zna moderne standarde i best practices
- **Objašnjenja** - objašnjava zašto je nešto problem
- **Sugestije** - daje konkretne predloge kako da popraviš

---

## Kako se sve koristi zajedno?

### Scenario: Developer otvori Pull Request

```
1. GitHub šalje webhook → "PR opened"
   ↓
2. Webhook handler → Dodaje job u queue
   ↓
3. Worker procesira job:
   
   a) Dohvata PR fajlove sa GitHub-a
      ↓
   b) Za svaki fajl:
      
      i) Language Detector → Da li je JS/TS?
         ↓
      ii) AST Parser → Parsira kod u strukturu
         ↓
      iii) Security Service → Proverava security probleme
         ↓
      iv) LLM Service → AI analiza koda
         ↓
      v) Kombinuje sve rezultate
         ↓
   c) Sačuva rezultate u bazi
      ↓
   d) Postavi komentare na GitHub PR
```

### Konkretan primer:

**PR sadrži fajl `src/auth.ts`:**
```typescript
function login(username: string, password: string) {
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  return db.query(query);
}
```

**Analiza:**

1. **Language Detector:** ✅ TypeScript
2. **AST Parser:** 
   - Funkcija `login` na liniji 1
   - Kompleksnost: 1
3. **Security Service:**
   - ❌ SQL Injection (linija 2)
   - ❌ Plain text password (linija 2)
4. **LLM Service:**
   - ❌ Nema input validation
   - ❌ Nema password hashing
   - ❌ Nema error handling
   - Score: 20/100

**Rezultat:**
- 2 CRITICAL security problema
- 3 HIGH quality problema
- Komentari se postavljaju na GitHub PR
- Developer vidi sve probleme i kako da ih popravi

---

## Zašto je ovo korisno?

### Za developere:
- ✅ **Automatski code review** - ne mora čekati čoveka
- ✅ **Uči best practices** - vidi šta je dobro/loše
- ✅ **Smanjuje greške** - pronalazi probleme pre production-a
- ✅ **Brže** - instant feedback umesto čekanja

### Za timove:
- ✅ **Konzistentan kvalitet** - svi PR-ovi se analiziraju isto
- ✅ **Security** - automatski pronalazi vulnerabilnosti
- ✅ **Manje bug-ova** - problemi se pronalaze ranije
- ✅ **Manje code review vremena** - AI radi osnovnu analizu

### Za projekte:
- ✅ **Bolji kod** - kontinuirano poboljšanje kvaliteta
- ✅ **Manje security incidenta** - ranije pronalaženje problema
- ✅ **Brži development** - manje vremena na debugging
- ✅ **Skalabilno** - radi za bilo koji broj PR-ova

---

## Šta još treba?

Trenutno imamo:
- ✅ Language Detector
- ✅ AST Parser
- ✅ Security Service
- ✅ LLM Service

**Sledeće:**
- ⏳ **Analysis Service** - kombinuje sve ovo zajedno
- ⏳ **Worker Update** - integrira sve u worker
- ⏳ **GitHub Integration** - dohvata fajlove i postavlja komentare

Kada završimo, imaćemo **kompletan sistem** koji automatski analizira PR-ove! 🚀
