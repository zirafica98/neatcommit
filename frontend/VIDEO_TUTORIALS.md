# Video Tutorials Setup Guide

## Kako dodati video tutoriale

Video tutoriali se konfigurišu u `help.component.ts` fajlu. Svaki tutorial može biti:

1. **YouTube video** - automatski se konvertuje u embed format
2. **Vimeo video** - automatski se konvertuje u embed format  
3. **Eksterni link** - otvara se u novom tabu

### Primer konfiguracije:

```typescript
videoTutorials = [
  {
    title: 'Getting Started with NeatCommit',
    description: 'Learn how to set up and use NeatCommit for the first time.',
    duration: '5 min',
    category: 'Basics',
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID', // YouTube URL
    videoType: 'youtube',
  },
  {
    title: 'Understanding Security Scores',
    description: 'Learn how security scores are calculated.',
    duration: '8 min',
    category: 'Security',
    videoUrl: 'https://vimeo.com/VIDEO_ID', // Vimeo URL
    videoType: 'vimeo',
  },
  {
    title: 'External Tutorial',
    description: 'External video tutorial.',
    duration: '6 min',
    category: 'Documentation',
    videoUrl: 'https://example.com/video', // Bilo koji eksterni link
    videoType: 'external',
  },
];
```

## Podržani formati URL-a:

### YouTube:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

### Vimeo:
- `https://vimeo.com/VIDEO_ID`
- `https://vimeo.com/channels/CHANNEL/VIDEO_ID`

### Eksterni:
- Bilo koji validan URL (otvara se u novom tabu)

## Kako funkcioniše:

1. **YouTube/Vimeo**: URL se automatski konvertuje u embed format i prikazuje se u modal dialogu
2. **Eksterni link**: Prikazuje se dugme koje otvara video u novom tabu
3. **Bez URL-a**: Ako `videoUrl` je prazan string, prikazuje se poruka "Video tutorial is coming soon!"

## Dodavanje novog tutoriala:

1. Otvori `frontend/src/app/features/help/help/help.component.ts`
2. Dodaj novi objekat u `videoTutorials` niz
3. Popuni sva polja (title, description, duration, category, videoUrl, videoType)
4. Sačuvaj fajl

## Napomena:

Modal automatski detektuje tip videa na osnovu URL-a, ali je bolje eksplicitno navesti `videoType` za pouzdanije funkcionisanje.
