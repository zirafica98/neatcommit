# GitHub Private Key Format

## Problem

Ako vidite grešku:
```
error:1E08010C:DECODER routines::unsupported
```

To znači da Node.js ne može da dekodira private key. Problem je verovatno u formatu `GITHUB_PRIVATE_KEY` u `.env` fajlu.

## Kako da proverite format

### 1. Proverite da li private key ima BEGIN/END zaglavlja

Private key **MORA** da ima:
```
-----BEGIN RSA PRIVATE KEY-----
... (sadržaj ključa) ...
-----END RSA PRIVATE KEY-----
```

### 2. Proverite format u `.env` fajlu

Private key može biti u jednom od sledećih formata:

#### ✅ Format 1: Sa `\n` escape sekvencama (jedan red)
```env
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
```

#### ✅ Format 2: Multi-line string (više redova)
```env
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIE...
...
-----END RSA PRIVATE KEY-----"
```

#### ❌ Format 3: Sa `\\n` (double escaped) - **NE RADI**
```env
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\nMIIE...\\n-----END RSA PRIVATE KEY-----"
```

## Kako da ispravite

### Opcija A: Koristite `\n` escape sekvence (preporučeno)

1. Otvorite `.env` fajl
2. Proverite da li private key ima `\n` umesto stvarnih novih redova
3. Ako nema, zamenite sve nove redove sa `\n`

Primer:
```env
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END RSA PRIVATE KEY-----"
```

### Opcija B: Koristite multi-line string

1. Otvorite `.env` fajl
2. Proverite da li private key ima stvarne nove redove
3. Ako nema, dodajte nove redove posle `-----BEGIN RSA PRIVATE KEY-----` i pre `-----END RSA PRIVATE KEY-----`

Primer:
```env
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...
-----END RSA PRIVATE KEY-----"
```

## Kako da dobijete private key iz GitHub-a

1. Idite na: https://github.com/settings/apps/VAŠA_APP_IME
2. Kliknite na "Generate a private key"
3. Download-ujte `.pem` fajl
4. Otvorite `.pem` fajl u text editoru
5. Kopirajte **CEO** sadržaj (uključujući `-----BEGIN RSA PRIVATE KEY-----` i `-----END RSA PRIVATE KEY-----`)
6. Paste-ujte u `.env` fajl kao `GITHUB_PRIVATE_KEY="..."`

## Provera

Nakon što ste ispravili format, restartujte server:

```bash
cd backend
npm run dev
```

Ako vidite u logovima:
```
✅ GitHub App initialized successfully
```

To znači da je private key u pravom formatu!

## Još problema?

Ako i dalje imate problema, proverite:

1. Da li private key ima sve karaktere (nije skraćen)
2. Da li nema dodatnih razmaka na početku/kraju
3. Da li su svi `\n` escape sekvence (ne `\\n`)
4. Da li su BEGIN/END zaglavlja tačna
