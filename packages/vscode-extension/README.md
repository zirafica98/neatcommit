# NeatCommit VS Code Extension

Prikazuje rezultate NeatCommit analize (issue-e) u VS Code Problems panelu i kao podvlake u editoru.

## Podešavanje

1. **neatcommit.apiUrl** – URL backend API-ja (default: `https://api.neatcommit.com`). Za lokalni razvoj npr. `http://localhost:3000`.
2. **neatcommit.token** – JWT token za API. Bez njega ekstenzija ne može da učita rezultate.

### Kako dobiti JWT (token)

1. Uloguj se na NeatCommit dashboard i otvori **Settings** (u meniju aplikacije).
2. U sekciji **API Token** klikni **Copy API token** – token se kopira u clipboard.
3. U VS Code: **File → Preferences → Settings**, potraži "NeatCommit", u polje **NeatCommit: Token** nalepi token. Ili u `settings.json`: `"neatcommit.token": "eyJ..."`.

Token je tvoj trenutni sesijski JWT i ističe kada se odjaviš; tada ponovo kopiraj token iz Settings.

## Korišćenje

- Otvori workspace koji je Git repozitorijum sa **GitHub** `origin` remote-om.
- Iz Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) pokreni **NeatCommit: Refresh**.
- Ekstenzija dohvata poslednji završeni review za taj repo i prikazuje issue-e kao diagnostike (Problems panel + underline u fajlovima).

## Ograničenja

- Podržan je samo GitHub (detekcija `remote.origin.url`).
- Prikazuje se **poslednji završeni** review za trenutni repo; nema izbora PR-a ili brancha iz ekstenzije.
