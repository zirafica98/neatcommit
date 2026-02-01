# 🎨 Frontend Development Plan

## Tech Stack

- **Angular 17+** - Modern Angular sa standalone components
- **Angular Material** - UI komponente
- **RxJS** - Reactive programming
- **Angular Router** - Navigation
- **Angular HttpClient** - API calls

---

## Projektna Struktura

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/              # Core services, guards, interceptors
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── review.service.ts
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   └── interceptors/
│   │   │       └── auth.interceptor.ts
│   │   ├── features/          # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   └── auth.routes.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.component.ts
│   │   │   │   └── components/
│   │   │   ├── repositories/
│   │   │   │   ├── repositories.component.ts
│   │   │   │   └── components/
│   │   │   └── reviews/
│   │   │       ├── reviews.component.ts
│   │   │       ├── review-detail/
│   │   │       └── components/
│   │   ├── shared/            # Shared components
│   │   │   ├── components/
│   │   │   │   ├── header/
│   │   │   │   ├── sidebar/
│   │   │   │   └── footer/
│   │   │   └── pipes/
│   │   ├── layout/            # Layout components
│   │   │   └── main-layout/
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   └── app.config.ts
│   ├── assets/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   └── styles.scss
├── angular.json
├── package.json
└── tsconfig.json
```

---

## Faza 1: Projekt Setup

### 1.1 Kreiranje Angular Projekta
- [x] Angular CLI projekat
- [ ] Routing configuration
- [ ] SCSS styling
- [ ] Standalone components

### 1.2 Angular Material
- [ ] Install Angular Material
- [ ] Material theme
- [ ] Material icons
- [ ] Material modules

### 1.3 Environment Configuration
- [ ] Development environment
- [ ] Production environment
- [ ] API URL configuration

---

## Faza 2: Core Infrastructure

### 2.1 Core Services
- [ ] API Service (HttpClient wrapper)
- [ ] Auth Service (GitHub OAuth)
- [ ] Review Service
- [ ] Repository Service

### 2.2 Guards & Interceptors
- [ ] Auth Guard (protected routes)
- [ ] Auth Interceptor (JWT tokens)
- [ ] Error Interceptor

### 2.3 Models/Interfaces
- [ ] User interface
- [ ] Review interface
- [ ] Issue interface
- [ ] Repository interface

---

## Faza 3: Layout & Navigation

### 3.1 Layout Components
- [ ] Main Layout
- [ ] Header (navigation, user menu)
- [ ] Sidebar (optional)
- [ ] Footer

### 3.2 Routing
- [ ] App routes
- [ ] Auth routes
- [ ] Feature routes
- [ ] Route guards

---

## Faza 4: Authentication

### 4.1 Login Page
- [ ] GitHub OAuth button
- [ ] OAuth callback handler
- [ ] Token storage
- [ ] Redirect logic

### 4.2 Auth Flow
- [ ] GitHub OAuth redirect
- [ ] Token exchange
- [ ] User session
- [ ] Logout

---

## Faza 5: Dashboard

### 5.1 Dashboard Component
- [ ] Security score card
- [ ] Recent reviews list
- [ ] Statistics cards
- [ ] Quick actions

### 5.2 Charts & Visualizations
- [ ] Security score trend
- [ ] Issue distribution
- [ ] Language breakdown
- [ ] Time-based metrics

---

## Faza 6: Repository Management

### 6.1 Repository List
- [ ] Repository cards
- [ ] Filter & search
- [ ] Installation status
- [ ] Enable/disable toggle

### 6.2 Installation Flow
- [ ] GitHub App installation
- [ ] Repository selection
- [ ] Installation confirmation
- [ ] Settings per repository

---

## Faza 7: Review Details

### 7.1 Review List
- [ ] Review cards
- [ ] Filter by severity
- [ ] Filter by repository
- [ ] Sort options

### 7.2 Review Detail
- [ ] Issue list
- [ ] Issue details modal
- [ ] Code viewer (syntax highlighting)
- [ ] Suggested fixes
- [ ] GitHub PR link

---

## Faza 8: Settings

### 8.1 User Profile
- [ ] Profile information
- [ ] Avatar
- [ ] GitHub account link

### 8.2 Notifications
- [ ] Notification preferences
- [ ] Email settings
- [ ] Webhook settings

---

## Korak po Korak Plan

### Korak 1: Projekt Setup
1. Kreiraj Angular projekat
2. Install Angular Material
3. Setup environment files
4. Configure routing

### Korak 2: Core Services
1. API Service
2. Auth Service
3. Models/Interfaces

### Korak 3: Layout
1. Main Layout
2. Header
3. Navigation

### Korak 4: Authentication
1. Login page
2. OAuth flow
3. Auth guard

### Korak 5: Dashboard
1. Dashboard component
2. Statistics cards
3. Recent reviews

### Korak 6: Features
1. Repositories
2. Reviews
3. Settings

---

**Status:** Spremno za početak! 🚀
