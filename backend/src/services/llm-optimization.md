# 💰 LLM Cost Optimization Strategy

## Problem
- GPT-4-turbo-preview: ~$0.01-0.03 per 1K tokens
- Za 9 jednostavnih fajlova: ~$0.50
- Za 100 PR-ova sa 10 fajlova: ~$50 (neodrživo!)

## Rešenja

### 1. ✅ Koristi GPT-3.5-turbo (10x jeftinije)
- GPT-3.5-turbo: ~$0.001-0.002 per 1K tokens
- **Ušteda: 90%**

### 2. ✅ Inteligentno filtriranje
- LLM samo za fajlove sa security problemima (CRITICAL/HIGH)
- LLM samo za kompleksne fajlove (>500 linija, >10 funkcija)
- **Ušteda: 50-70%**

### 3. ✅ Code truncation
- Ograniči kod na max 2000 linija
- Pošalji samo relevantne delove (funkcije sa problemima)
- **Ušteda: 30-50%**

### 4. ✅ Selective analysis
- LLM samo za probleme koje Security Service ne može da detektuje
- Skip LLM ako Security Service već našao sve probleme
- **Ušteda: 40-60%**

### 5. ✅ Token optimization
- Smanji max_tokens sa 2000 na 1000
- Optimizuj prompt (kraći, fokusiraniji)
- **Ušteda: 20-30%**

### 6. ✅ Caching (opciono)
- Cache rezultate za identičan kod (hash)
- **Ušteda: 10-30%** (zavisi od duplikata)

## Ukupna ušteda
**Pre:** ~$50 za 100 PR-ova  
**Posle:** ~$2-5 za 100 PR-ova  
**Ušteda: 90-96%** 🎉
