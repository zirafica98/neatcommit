# 💰 LLM Cost Optimization - Implementacija

## Problem

**Pre optimizacije:**
- GPT-4-turbo-preview: ~$0.01-0.03 per 1K tokens
- Za 9 jednostavnih fajlova: ~$0.50
- Za 100 PR-ova sa 10 fajlova: ~$50/mesec (neodrživo!)

## Implementirane Optimizacije

### 1. ✅ GPT-3.5-turbo umesto GPT-4

**Promena:**
```typescript
// Pre: 'gpt-4-turbo-preview'
// Posle: 'gpt-3.5-turbo' (default)
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-3.5-turbo';
```

**Ušteda:** 90% (GPT-3.5 je 10x jeftiniji)

**Cena:**
- GPT-4-turbo: ~$0.01-0.03 per 1K tokens
- GPT-3.5-turbo: ~$0.001-0.002 per 1K tokens

**Napomena:** Možeš promeniti na GPT-4 preko `LLM_MODEL=gpt-4-turbo-preview` u `.env` ako želiš bolje rezultate.

---

### 2. ✅ Inteligentno Filtriranje

**LLM se poziva samo ako:**
- Ima CRITICAL/HIGH security problema (LLM može naći dodatne)
- Ili je kompleksan kod (>500 linija ili >10 funkcija)
- Ili je veliki fajl bez problema (>200 linija) - možda ima probleme koje Security Service ne vidi

**Kod:**
```typescript
const hasCriticalIssues = securityIssues.some(i => 
  i.severity === 'CRITICAL' || i.severity === 'HIGH'
);
const isComplex = codeLines > 500 || functions > 10;
const shouldUseLLM = hasCriticalIssues || isComplex || 
  (securityIssues.length === 0 && codeLines > 200);
```

**Ušteda:** 50-70% (većina jednostavnih fajlova se preskače)

---

### 3. ✅ Code Truncation

**Ograničenje veličine koda:**
- Max 2000 linija po fajlu
- Ako je veći, uzima prve 1900 + poslednje 100 linija

**Kod:**
```typescript
const MAX_CODE_LINES = 2000;
if (codeLines.length > MAX_CODE_LINES) {
  // Truncate code
}
```

**Ušteda:** 30-50% (manje token-a za velike fajlove)

---

### 4. ✅ Token Optimization

**Promene:**
- `max_tokens`: 2000 → 1000 (smanjeno za 50%)
- Optimizovan prompt (kraći, fokusiraniji)
- Uklonjeni nepotrebni delovi

**Kod:**
```typescript
const MAX_TOKENS = 1000; // Pre: 2000
```

**Ušteda:** 20-30%

---

### 5. ✅ Optimizovan Prompt

**Pre:**
- Dugačak prompt sa puno instrukcija
- Ceo kod bez obzira na veličinu
- Detaljna struktura

**Posle:**
- Kraći, fokusiraniji prompt
- Truncated kod za velike fajlove
- Samo relevantne informacije

**Ušteda:** 20-40% token-a

---

## Rezultat

### Pre Optimizacije
- **Model:** GPT-4-turbo-preview
- **Poziva:** Za svaki fajl
- **Token-i:** ~2000 per fajl
- **Cena:** ~$0.05-0.10 per fajl
- **100 PR-ova (10 fajlova):** ~$50-100

### Posle Optimizacije
- **Model:** GPT-3.5-turbo (10x jeftiniji)
- **Poziva:** Samo za 30-50% fajlova (inteligentno filtriranje)
- **Token-i:** ~500-1000 per fajl (optimizovan prompt + truncation)
- **Cena:** ~$0.0005-0.002 per fajl
- **100 PR-ova (10 fajlova):** ~$1.50-6

### Ukupna Ušteda: **90-97%** 🎉

**Pre:** ~$50-100/mesec  
**Posle:** ~$1.50-6/mesec  
**Ušteda:** ~$45-95/mesec

---

## Konfiguracija

Dodaj u `.env` fajl (opciono):

```env
# LLM Model (default: gpt-3.5-turbo)
LLM_MODEL=gpt-3.5-turbo

# Za bolje rezultate (skuplje):
# LLM_MODEL=gpt-4-turbo-preview

# Max tokens per request (default: 1000)
LLM_MAX_TOKENS=1000

# Max code lines to send (default: 2000)
LLM_MAX_CODE_LINES=2000
```

---

## Trade-offs

### ✅ Prednosti
- **90-97% ušteda** na troškovima
- Security Service i dalje radi za sve fajlove
- LLM se koristi samo gde je potreban

### ⚠️ Kompromisi
- GPT-3.5 je manje precizan od GPT-4
- Neki jednostavni fajlovi ne dobijaju LLM analizu
- Manje detaljne LLM analize (kraći prompt)

### 💡 Preporuka
- **Za development:** GPT-3.5-turbo (jeftinije)
- **Za produkciju:** Možeš koristiti GPT-4 za kritične projekte
- **Hybrid:** GPT-3.5 za većinu, GPT-4 za kritične fajlove (može se implementirati)

---

## Monitoring

Prati troškove u OpenAI dashboard-u:
- Dashboard: https://platform.openai.com/usage
- Podesi billing alerts
- Monitoruj token usage u logovima

**Log format:**
```
debug OpenAI analysis completed
   └─ filename=app.js | tokensUsed=1234
```

---

## Sledeći Koraci (Opciono)

1. **Caching** - Cache rezultate za identičan kod (hash)
2. **Batch Processing** - Grupiši više fajlova u jedan prompt
3. **Selective GPT-4** - GPT-4 samo za kritične fajlove
4. **Rate Limiting** - Ograniči broj LLM poziva po PR-u

---

**Status:** ✅ **IMPLEMENTIRANO**

**Datum:** 2026-01-25
