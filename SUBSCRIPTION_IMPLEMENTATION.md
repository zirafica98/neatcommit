# Subscription System - Implementation Guide

## Šta je urađeno

### 1. Database Schema ✅
- Dodat `Subscription` model u Prisma schema
- Povezan sa `User` modelom (one-to-one)
- Polja: planType, status, period dates, usage counters, Stripe IDs

### 2. Backend Services ✅
- `subscription.service.ts` - glavni servis za subscription management
- Funkcije:
  - `getOrCreateSubscription()` - kreira FREE subscription ako ne postoji
  - `canCreateReview()` - proverava review limit
  - `canAddRepository()` - proverava repository limit
  - `incrementReviewUsage()` - povećava broj korišćenih reviews
  - `updateRepositoryCount()` - ažurira broj repositories
  - `hasFeatureAccess()` - proverava pristup feature-u
  - `getUserLimits()` - dohvata limits za korisnika
  - `updateSubscription()` - ažurira subscription plan

### 3. Backend Middleware ✅
- `subscription.middleware.ts` - middleware za proveru limits
  - `checkReviewLimit()` - middleware za review limit
  - `checkRepositoryLimit()` - middleware za repository limit

### 4. API Routes ✅
- `/api/subscription` - GET - dohvata subscription info
- `/api/subscription/plans` - GET - dohvata sve planove
- `/api/subscription/upgrade` - POST - upgrade plan (bez Stripe za sada)

## Sledeći koraci

### 1. Prisma Migration
```bash
cd backend
npx prisma migrate dev --name add_subscription_model
npx prisma generate
```

### 2. Integracija u postojeće endpoint-e

#### A. Webhook Handler (kreiranje review-a)
U `backend/src/api/routes/webhooks.ts`, dodati proveru pre kreiranja review-a:

```typescript
import { checkReviewLimit, incrementReviewUsage } from '../../services/subscription.service';

// Pre kreiranja review-a
const check = await canCreateReview(userId);
if (!check.allowed) {
  // Vrati grešku ili preskoči
  return;
}

// Nakon uspešnog kreiranja review-a
await incrementReviewUsage(userId);
```

#### B. Repository Management
U `backend/src/api/routes/repositories.ts`, dodati proveru pre dodavanja repository-ja:

```typescript
import { checkRepositoryLimit, updateRepositoryCount } from '../../services/subscription.service';

// Pre dodavanja repository-ja
const check = await canAddRepository(userId);
if (!check.allowed) {
  return res.status(403).json({ error: check.reason });
}

// Nakon dodavanja, ažuriraj count
const count = await prisma.repository.count({ where: { ... } });
await updateRepositoryCount(userId, count);
```

#### C. LLM Model Selection
U `backend/src/services/llm.service.ts`, koristiti subscription za odabir modela:

```typescript
import { getUserLimits } from './subscription.service';

const limits = await getUserLimits(userId);
const model = limits.llmModel; // 'gpt-3.5-turbo' ili 'gpt-4o'
```

### 3. Frontend Implementation

#### A. Subscription Service
Kreirati `frontend/src/app/core/services/subscription.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  constructor(private apiService: ApiService) {}

  getSubscription(): Observable<any> {
    return this.apiService.get('/api/subscription');
  }

  getPlans(): Observable<any> {
    return this.apiService.get('/api/subscription/plans');
  }

  upgradePlan(planType: string): Observable<any> {
    return this.apiService.post('/api/subscription/upgrade', { planType });
  }
}
```

#### B. Pricing Page
Kreirati `frontend/src/app/features/pricing/pricing.component.ts` sa prikazom svih paketa i upgrade opcijama.

#### C. Usage Indicators
U Dashboard i Settings, prikazati:
- Reviews used / limit
- Repositories used / limit
- Current plan
- Upgrade button

### 4. Stripe Integration (opciono, za production)

#### A. Install Stripe
```bash
cd backend
npm install stripe @types/stripe
```

#### B. Stripe Configuration
Dodati u `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### C. Stripe Checkout
Kreirati endpoint za Stripe Checkout session:
```typescript
// POST /api/subscription/checkout
// Kreira Stripe Checkout session i redirect-uje korisnika
```

#### D. Stripe Webhook
Kreirati webhook handler za Stripe events:
- `checkout.session.completed` - aktivira subscription
- `customer.subscription.updated` - ažurira subscription
- `customer.subscription.deleted` - otkazuje subscription

## Testiranje

1. **Kreiraj novog korisnika** - trebalo bi automatski da dobije FREE subscription
2. **Testiraj review limit** - pokušaj da kreiraš više od 5 reviews
3. **Testiraj repository limit** - pokušaj da dodaš više od 1 repository
4. **Testiraj upgrade** - upgrade na PRO ili ENTERPRISE
5. **Proveri limits** - da li se limits pravilno primenjuju

## Napomene

- Za development, upgrade radi direktno bez Stripe-a
- Za production, potrebna je Stripe integracija
- Monthly reset se dešava automatski kada se promeni mesec
- Repository count se ažurira automatski kada se doda/ukloni repository
