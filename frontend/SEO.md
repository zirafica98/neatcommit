# SEO setup (NeatCommit)

## Šta je urađeno

- **index.html**: naslov, meta description, keywords, theme-color, Open Graph (og:title, og:description, og:url, og:site_name, og:locale), Twitter Card (twitter:card, twitter:title, twitter:description), canonical link, JSON-LD (Organization + SoftwareApplication).
- **SeoService**: dinamičko postavljanje title i meta po ruti (landing, docs, news).
- **Landing**: FAQ JSON-LD (FAQPage) za rich results u pretrazi; semantički HTML (main, header, footer, nav, aria-label, section aria-labelledby).
- **Docs i News**: semantički main/nav, Title i meta po stranici.
- **robots.txt**: dozvoljeno indeksiranje javnih stranica (/ , /docs, /news, /auth/login); Disallow za /app i /api; link na Sitemap.
- **sitemap.xml**: lista javnih URL-ova sa prioritetom i changefreq.

## Šta treba da zameniš za production

Kada imaš finalni domen (npr. `https://neatcommit.com`):

1. **index.html**  
   Zameni `https://neatcommit.com` u:
   - `<meta property="og:url" content="...">`
   - `<link rel="canonical" href="...">`
   - U JSON-LD u `url`, `logo`, i u `SoftwareApplication.url`.

2. **public/robots.txt**  
   U redu `Sitemap:` stavi pun URL sitemap-a, npr. `https://neatcommit.com/sitemap.xml`.

3. **public/sitemap.xml**  
   U svim `<loc>` tagovima zameni `https://neatcommit.com` sa tvojim domenom.

Opciono: ako imaš OG sliku za deljenje (npr. 1200×630 px), dodaj u `index.html`:
`<meta property="og:image" content="https://tvoj-domen.com/assets/og-image.png">`  
i u SeoService ili u index za Twitter:  
`<meta name="twitter:image" content="https://tvoj-domen.com/assets/og-image.png">`.
