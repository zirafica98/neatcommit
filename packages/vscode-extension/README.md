# NeatCommit VS Code Extension

Prikazuje rezultate NeatCommit analize (issue-e) u VS Code Problems panelu i kao podvlake u editoru.

## Podešavanje

1. **neatcommit.apiUrl** – URL backend API-ja (default: `https://api.neatcommit.com`). Za lokalni razvoj npr. `http://localhost:3000`.
2. **neatcommit.token** – JWT token za API. Bez njega ekstenzija ne može da učita rezultate.

### Kako dobiti JWT (token)

- Uloguj se na NeatCommit dashboard (web aplikacija).
- U podešavanjima naloga / profilu potraži opciju za **API token** ili **Generate JWT** (zavisi od implementacije frontenda). Kopiraj token.
- U VS Code: **File → Preferences → Settings**, potraži "NeatCommit", u polje **NeatCommit: Token** nalepi token. Možeš i u `settings.json`: `"neatcommit.token": "eyJ..."`.

## Korišćenje

- Otvori workspace koji je Git repozitorijum sa **GitHub** `origin` remote-om.
- Iz Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) pokreni **NeatCommit: Refresh**.
- Ekstenzija dohvata poslednji završeni review za taj repo i prikazuje issue-e kao diagnostike (Problems panel + underline u fajlovima).

## Ograničenja

- Podržan je samo GitHub (detekcija `remote.origin.url`).
- Prikazuje se **poslednji završeni** review za trenutni repo; nema izbora PR-a ili brancha iz ekstenzije.
