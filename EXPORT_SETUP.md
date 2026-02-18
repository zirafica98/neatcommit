# Export Functionality Setup

## Instalacija paketa

Za export funkcionalnost, potrebno je instalirati sledeće pakete:

```bash
cd backend
npm install pdfkit @types/pdfkit xlsx
```

## Dostupni export formati

### 1. PDF Export (Review)
- **Endpoint**: `GET /api/export/review/:id/pdf`
- **Opis**: Exportuje kompletan review sa svim issues-ima u PDF format
- **Korišćenje**: Klik na "Export PDF" dugme na Review Detail stranici

### 2. CSV Export (Issues)
- **Endpoint**: `GET /api/export/issues/csv`
- **Query parametri**:
  - `severity` (opciono): Filter po severity-ju (CRITICAL, HIGH, MEDIUM, LOW)
  - `reviewId` (opciono): Filter po review ID-u
- **Opis**: Exportuje issues u CSV format
- **Korišćenje**: 
  - Klik na "Export Issues CSV" na Reviews stranici (exportuje sve issues sa trenutnim filterom)
  - Klik na "Export Issues CSV" na Review Detail stranici (exportuje issues za taj review)

### 3. Excel Export (Statistics)
- **Endpoint**: `GET /api/export/stats/excel`
- **Opis**: Exportuje statistike u Excel format sa više sheet-ova:
  - Summary: Ukupne statistike
  - Reviews by Status: Raspodela review-a po statusu
  - Issues by Category: Raspodela issues-a po kategorijama
- **Korišćenje**: Klik na "Export Statistics" dugme na Dashboard stranici

## Frontend integracija

Export funkcionalnost je integrisana u:
- **Dashboard**: "Export Statistics" dugme u header-u
- **Reviews**: "Export Issues CSV" dugme u header-u
- **Review Detail**: "Export PDF" i "Export Issues CSV" dugmad

## Performance optimizacije

### 1. Lazy Loading
- Svi feature moduli koriste lazy loading (`loadChildren` / `loadComponent`)
- Preload strategija: `PreloadAllModules` - učitava module u pozadini

### 2. Code Splitting
- Automatski code splitting po ruti
- Svaki feature modul je zaseban bundle

### 3. Image Optimization
- Lazy loading za sve slike (`loading="lazy"` atribut)
- Custom `LazyImageDirective` za napredniji lazy loading (opciono)

### 4. HTTP Caching
- Cache interceptor automatski cache-uje GET zahteve
- Cache trajanje: 5 minuta
- Ne cache-uje auth i export endpoint-e

## Build optimizacije

Production build uključuje:
- Script minification
- Style minification
- Font inlining
- Output hashing za cache busting

## Napomene

- Export endpoint-i zahtevaju autentifikaciju (JWT token)
- PDF export zahteva `pdfkit` paket
- Excel export zahteva `xlsx` paket
- CSV export ne zahteva dodatne pakete
