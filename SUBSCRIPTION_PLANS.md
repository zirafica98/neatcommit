# Subscription Plans - NeatCommit

## Planovi

### 🆓 Free Plan
**Cena:** $0/mesec
- ✅ 5 reviews mesečno
- ✅ 1 repository
- ✅ GPT-3.5-turbo za code review
- ✅ Osnovni security checks
- ✅ Dashboard sa osnovnim statistikama
- ✅ Export (PDF, CSV, Excel)
- ❌ Email notifikacije
- ❌ Priority support

### 💼 Pro Plan
**Cena:** $29/mesec
- ✅ 100 reviews mesečno
- ✅ 10 repositories
- ✅ GPT-4o za code review
- ✅ Napredni security checks
- ✅ Dashboard sa analytics i charts
- ✅ Export (PDF, CSV, Excel)
- ✅ Email notifikacije
- ✅ Priority support

### 🚀 Enterprise Plan
**Cena:** $99/mesec
- ✅ Unlimited reviews
- ✅ Unlimited repositories
- ✅ GPT-4o za code review
- ✅ Sve security checks
- ✅ Full dashboard sa analytics
- ✅ Export (PDF, CSV, Excel)
- ✅ Email notifikacije
- ✅ Priority support
- ✅ Custom integrations
- ✅ Dedicated account manager

## Implementacija

### 1. Database Schema
Dodati `Subscription` model u Prisma schema sa:
- `planType`: FREE | PRO | ENTERPRISE
- `status`: ACTIVE | CANCELLED | EXPIRED
- `currentPeriodStart`: DateTime
- `currentPeriodEnd`: DateTime
- `reviewsUsedThisMonth`: Int
- `repositoriesCount`: Int
- `stripeSubscriptionId`: String? (za Stripe integraciju)
- `stripeCustomerId`: String? (za Stripe integraciju)

### 2. Backend Middleware
Kreirati middleware za proveru limits:
- `checkReviewLimit()` - proverava da li korisnik može da kreira review
- `checkRepositoryLimit()` - proverava da li korisnik može da doda repository
- `checkFeatureAccess()` - proverava da li korisnik ima pristup feature-u

### 3. Frontend UI
- Pricing page sa prikazom svih paketa
- Upgrade/Downgrade opcije u Settings
- Usage indicators (reviews used/limit, repositories used/limit)
- Payment integration (Stripe Checkout)

### 4. Payment Integration
- Stripe Checkout za jednokratne i recurring payments
- Webhook handler za Stripe events (subscription created/updated/cancelled)
- Automatsko ažuriranje subscription statusa
