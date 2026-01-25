# Webhook Setup - Rešavanje problema sa ngrok

## Problem
GitHub ne može da dostavi webhook zbog ngrok free plan-a koji prikazuje banner/interstitial.

## Rešenje 1: Pokrenite ngrok ručno u novom terminalu

1. Otvorite **novi terminal prozor**
2. Pokrenite:
   ```bash
   cd "/Volumes/Extreme Pro/Projects/Elementer/backend"
   ngrok http 3000
   ```
3. Kopirajte **HTTPS URL** koji se pojavi (npr. `https://xxxxx.ngrok-free.app`)
4. Ažurirajte webhook URL u GitHub App:
   - Idite na: https://github.com/settings/apps/2703662
   - Kliknite "Webhooks"
   - Kliknite na webhook
   - Promenite URL na: `https://YOUR-NGROK-URL.ngrok-free.app/webhook/github`
   - Kliknite "Update webhook"
5. Probajte "Redeliver" u GitHub-u

## Rešenje 2: Koristite localtunnel (alternativa)

1. Instalirajte localtunnel (već instaliran):
   ```bash
   npm install -g localtunnel
   ```

2. U **novom terminalu** pokrenite:
   ```bash
   npx localtunnel --port 3000
   ```
   
   Ili ako imate `lt` u PATH-u:
   ```bash
   lt --port 3000
   ```

3. Kopirajte URL koji se pojavi (npr. `https://xxxxx.loca.lt`)

4. Ažurirajte webhook URL u GitHub App na: `https://xxxxx.loca.lt/webhook/github`

## Rešenje 3: Koristite serveo.net (alternativa)

1. U **novom terminalu** pokrenite:
   ```bash
   ssh -R 80:localhost:3000 serveo.net
   ```

2. Kopirajte URL koji se pojavi

3. Ažurirajte webhook URL u GitHub App

## Provera

Nakon što ažurirate webhook URL, probajte:
1. "Redeliver" u GitHub webhook delivery-ima
2. Proverite server logove - trebalo bi da vidite:
   ```
   📡 Webhook received { event: 'installation', ... }
   ```

## Napomena

- **ngrok free plan** može imati ograničenja za webhook-ove
- **localtunnel** je besplatan ali URL se menja svaki put
- **serveo.net** je besplatan ali može biti nestabilan

Za produkciju, koristite:
- ngrok paid plan
- Railway/Render hosting sa javnim URL-om
- VPS sa javnom IP adresom
