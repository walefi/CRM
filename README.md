# CRM Enterprise

Enterprise CRM system inspired by Kommo, HubSpot, Salesforce and Pipedrive.

## Overview

A complete, production-ready CRM platform with multi-tenancy, pipeline management, deal tracking,
task management, AI-powered insights, automation engine, and enterprise-grade integrations.

Built with Clean Architecture, DDD, SOLID principles, and a focus on scalability, security, and
developer experience.

---

## Tech Stack

### Backend

| Technology     | Purpose           |
| -------------- | ----------------- |
| NestJS 10      | API Framework     |
| TypeScript 5   | Language          |
| Prisma 5       | ORM               |
| PostgreSQL 16  | Database          |
| Redis 7        | Cache / Queues    |
| BullMQ         | Job Queue         |
| JWT + Passport | Authentication    |
| Socket.IO      | Real-time         |
| Swagger        | API Documentation |
| Winston        | Logging           |

### Frontend

| Technology      | Purpose       |
| --------------- | ------------- |
| Next.js 14      | Framework     |
| React 18        | UI Library    |
| TypeScript 5    | Language      |
| Tailwind CSS 3  | Styling       |
| Shadcn UI       | Design System |
| React Query 5   | Server State  |
| Zustand 4       | Client State  |
| React Hook Form | Forms         |
| Zod             | Validation    |
| Framer Motion   | Animations    |

### Infrastructure

| Technology     | Purpose          |
| -------------- | ---------------- |
| Docker         | Containerization |
| Docker Compose | Orchestration    |
| Nginx          | Reverse Proxy    |
| pnpm + Turbo   | Monorepo         |
| GitHub Actions | CI/CD            |

---

## Project Structure

```
CRM/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── prisma/                   # Schema, Migrations, Seed
│   │   └── src/
│   │       ├── main.ts               # Bootstrap (Helmet, CORS, Swagger, Validation)
│   │       ├── app.module.ts         # Root Module
│   │       ├── domain/               # Domain Layer
│   │       │   ├── entities/         # Domain Entities
│   │       │   ├── value-objects/    # Value Objects
│   │       │   ├── repositories/     # Repository Interfaces
│   │       │   └── services/         # Domain Services
│   │       ├── application/          # Application Layer
│   │       │   ├── usecases/         # Use Cases
│   │       │   ├── commands/         # CQRS Commands
│   │       │   ├── queries/          # CQRS Queries
│   │       │   └── events/           # Domain Events
│   │       ├── infrastructure/       # Infrastructure Layer
│   │       │   ├── database/         # Database providers
│   │       │   ├── cache/            # Redis cache
│   │       │   ├── queue/            # BullMQ queue
│   │       │   ├── storage/          # File storage
│   │       │   ├── email/            # Email service
│   │       │   ├── ai/               # AI service
│   │       │   └── observability/    # Logging, Metrics, Tracing
│   │       ├── presentation/         # Presentation Layer
│   │       ├── shared/               # Shared Kernel
│   │       │   ├── constants/        # Constants
│   │       │   ├── exceptions/       # Exceptions
│   │       │   ├── utils/            # Utilities
│   │       │   └── types/            # Shared types
│   │       ├── common/               # Cross-cutting
│   │       │   ├── decorators/       # Custom decorators
│   │       │   ├── filters/          # Exception filters
│   │       │   ├── guards/           # Auth guards
│   │       │   ├── interceptors/     # Interceptors
│   │       │   ├── middlewares/      # Middlewares (RequestId)
│   │       │   └── pipes/            # Pipes
│   │       ├── config/               # Configuration
│   │       ├── prisma/               # Prisma Module
│   │       └── modules/              # Feature Modules
│   │           ├── auth/             # Authentication (JWT + RBAC)
│   │           ├── users/            # User Management
│   │           ├── tenants/          # Multi-tenant
│   │           ├── companies/        # Companies
│   │           ├── contacts/         # Contacts
│   │           ├── leads/            # Leads
│   │           ├── pipelines/        # Sales Pipeline
│   │           ├── deals/            # Deals
│   │           ├── tasks/            # Tasks
│   │           ├── notifications/    # Notifications
│   │           ├── integrations/     # External Integrations
│   │           ├── ai/               # AI Module
│   │           ├── automations/      # Workflow Automations
│   │           └── health/           # Health Check
│   └── web/                          # Next.js Frontend
│       └── src/
│           ├── app/                  # App Router
│           ├── components/
│           │   ├── layout/           # Layout components
│           │   ├── auth/             # Auth components
│           │   └── ui/               # UI primitives
│           ├── lib/                  # Utilities
│           ├── stores/               # Zustand stores
│           └── hooks/                # Custom hooks
├── packages/
│   ├── shared/                       # Shared Types & Constants
│   ├── ui/                           # Shared UI Components
│   ├── config/                       # Environment Validation (Zod)
│   ├── types/                        # Common TypeScript Types
│   ├── eslint-config/                # ESLint Configuration
│   └── tsconfig/                     # TypeScript Configuration
├── docker/
│   ├── api/Dockerfile                # API Dockerfile (multi-stage)
│   ├── web/Dockerfile                # Web Dockerfile (multi-stage)
│   └── nginx/nginx.conf              # Nginx Reverse Proxy
├── docs/                             # Documentation
├── scripts/                          # Utility Scripts
├── .github/workflows/                # CI/CD
├── docker-compose.yml                # Services orchestration
├── turbo.json                        # Turborepo config
└── pnpm-workspace.yaml               # pnpm workspaces
```

---

## Architecture

### Clean Architecture Layers

```
Presentation  →  Controllers, DTOs, Validators
Application   →  Use Cases, Commands, Queries, Events
Domain        →  Entities, Value Objects, Repository Interfaces, Domain Services
Infrastructure →  Database, Cache, Queue, Storage, Email, AI, Observability
Shared        →  Constants, Exceptions, Utilities, Types
```

### Design Principles

- **CQRS Ready** — Prepared for Command Query Responsibility Segregation
- **DDD** — Domain-Driven Design with aggregates, entities, value objects
- **SOLID** — Single Responsibility, Open-Closed, Liskov, Interface Segregation, Dependency Inversion
- **Repository Pattern** — Abstracted data access through repository interfaces
- **Event-Driven** — Domain events for decoupled communication
- **Factory Pattern** — Object creation through factories
- **Dependency Injection** — Inversion of Control via NestJS DI

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** and **Docker Compose**

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration if needed
```

### Development

```bash
# Start infrastructure (PostgreSQL, Redis, PgAdmin)
docker compose up -d postgres redis pgadmin

# Run database migrations
pnpm --filter @crm/api db:migrate

# Generate Prisma client
pnpm --filter @crm/api db:generate

# Seed database
pnpm --filter @crm/api db:seed

# Start all services in development
pnpm dev
```

### With Docker (Full Stack)

```bash
# Build and start everything
docker compose up -d --build

# Run migrations inside container
docker compose exec api pnpm db:migrate
```

### Access Points

| Service           | URL                                | Credentials               |
| ----------------- | ---------------------------------- | ------------------------- |
| **Frontend**      | http://localhost:3000              | admin@crm.com / Admin@123 |
| **API**           | http://localhost:3001              | —                         |
| **Swagger**       | http://localhost:3001/api/docs     | —                         |
| **PgAdmin**       | http://localhost:5050              | admin@crm.com / Admin@123 |
| **Prisma Studio** | `pnpm --filter @crm/api db:studio` | —                         |

### Default Credentials

- **Email:** admin@crm.com
- **Password:** Admin@123

---

## API Endpoints

### Health

| Method | Path           | Auth | Description                |
| ------ | -------------- | ---- | -------------------------- |
| GET    | /api/v1/health | No   | Health check (DB + memory) |

### Auth

| Method | Path                         | Auth | Description       |
| ------ | ---------------------------- | ---- | ----------------- |
| POST   | /api/v1/auth/login           | No   | User login        |
| POST   | /api/v1/auth/register        | No   | User registration |
| POST   | /api/v1/auth/refresh         | No   | Refresh tokens    |
| POST   | /api/v1/auth/logout          | Yes  | User logout       |
| GET    | /api/v1/auth/profile         | Yes  | Get profile       |
| POST   | /api/v1/auth/change-password | Yes  | Change password   |

### Users

| Method | Path              | Auth | Roles | Description |
| ------ | ----------------- | ---- | ----- | ----------- |
| GET    | /api/v1/users     | Yes  | —     | List users  |
| GET    | /api/v1/users/:id | Yes  | —     | Get user    |
| POST   | /api/v1/users     | Yes  | admin | Create user |
| PUT    | /api/v1/users/:id | Yes  | admin | Update user |
| DELETE | /api/v1/users/:id | Yes  | admin | Delete user |

### Tenants

| Method | Path                          | Auth | Roles | Description    |
| ------ | ----------------------------- | ---- | ----- | -------------- |
| GET    | /api/v1/tenants/current       | Yes  | —     | Current tenant |
| GET    | /api/v1/tenants/current/stats | Yes  | —     | Tenant stats   |
| GET    | /api/v1/tenants/:slug         | Yes  | —     | Tenant by slug |
| PUT    | /api/v1/tenants/current       | Yes  | admin | Update tenant  |
| DELETE | /api/v1/tenants/:id           | Yes  | admin | Delete tenant  |

### Products & Categories

| Method | Path                   | Auth | Roles | Description        |
| ------ | ---------------------- | ---- | ----- | ------------------ |
| GET    | /api/v1/products       | Yes  | —     | List products      |
| GET    | /api/v1/products/stats | Yes  | —     | Product statistics |
| GET    | /api/v1/products/:id   | Yes  | —     | Get product        |
| POST   | /api/v1/products       | Yes  | admin | Create product     |
| PATCH  | /api/v1/products/:id   | Yes  | admin | Update product     |
| DELETE | /api/v1/products/:id   | Yes  | admin | Delete product     |
| GET    | /api/v1/categories     | Yes  | —     | List categories    |
| POST   | /api/v1/categories     | Yes  | admin | Create category    |
| PATCH  | /api/v1/categories/:id | Yes  | admin | Update category    |
| DELETE | /api/v1/categories/:id | Yes  | admin | Delete category    |

### Quotes

| Method | Path                                           | Auth | Roles | Description                     |
| ------ | ---------------------------------------------- | ---- | ----- | ------------------------------- |
| GET    | /api/v1/quotes                                 | Yes  | —     | List quotes with filters        |
| GET    | /api/v1/quotes/stats                           | Yes  | —     | Quote statistics                |
| GET    | /api/v1/quotes/templates                       | Yes  | —     | List templates                  |
| POST   | /api/v1/quotes/templates                       | Yes  | admin | Create template                 |
| PATCH  | /api/v1/quotes/templates/:id                   | Yes  | admin | Update template                 |
| DELETE | /api/v1/quotes/templates/:id                   | Yes  | admin | Delete template                 |
| GET    | /api/v1/quotes/export/:id                      | Yes  | —     | Export quote (json/csv)         |
| GET    | /api/v1/quotes/:id                             | Yes  | —     | Get quote with items & versions |
| POST   | /api/v1/quotes                                 | Yes  | —     | Create quote                    |
| PATCH  | /api/v1/quotes/:id                             | Yes  | —     | Update quote                    |
| DELETE | /api/v1/quotes/:id                             | Yes  | admin | Soft delete quote               |
| POST   | /api/v1/quotes/:id/archive                     | Yes  | —     | Archive quote                   |
| POST   | /api/v1/quotes/:id/restore                     | Yes  | —     | Restore quote                   |
| POST   | /api/v1/quotes/:id/duplicate                   | Yes  | —     | Duplicate quote                 |
| POST   | /api/v1/quotes/:id/send                        | Yes  | —     | Send quote to customer          |
| POST   | /api/v1/quotes/:id/items                       | Yes  | —     | Add item to quote               |
| PATCH  | /api/v1/quotes/:id/items/:itemId               | Yes  | —     | Update quote item               |
| DELETE | /api/v1/quotes/:id/items/:itemId               | Yes  | —     | Remove quote item               |
| POST   | /api/v1/quotes/:id/items/reorder               | Yes  | —     | Reorder items                   |
| GET    | /api/v1/quotes/:id/versions                    | Yes  | —     | Get version history             |
| POST   | /api/v1/quotes/:id/versions/:versionId/restore | Yes  | —     | Restore version                 |

---

## Environment Variables

| Variable                 | Description                  | Default                 |
| ------------------------ | ---------------------------- | ----------------------- |
| `NODE_ENV`               | Environment                  | `development`           |
| `API_PORT`               | API server port              | `3001`                  |
| `API_URL`                | API URL                      | `http://localhost:3001` |
| `WEB_PORT`               | Web server port              | `3000`                  |
| `WEB_URL`                | Web URL                      | `http://localhost:3000` |
| `DATABASE_URL`           | PostgreSQL connection string | —                       |
| `POSTGRES_USER`          | PostgreSQL user              | `crm_user`              |
| `POSTGRES_PASSWORD`      | PostgreSQL password          | `crm_password`          |
| `POSTGRES_DB`            | PostgreSQL database          | `crm_db`                |
| `POSTGRES_PORT`          | PostgreSQL port              | `5432`                  |
| `REDIS_HOST`             | Redis host                   | `localhost`             |
| `REDIS_PORT`             | Redis port                   | `6379`                  |
| `REDIS_PASSWORD`         | Redis password               | —                       |
| `JWT_SECRET`             | JWT signing secret           | —                       |
| `JWT_REFRESH_SECRET`     | JWT refresh token secret     | —                       |
| `JWT_EXPIRATION`         | Access token expiry          | `15m`                   |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry         | `7d`                    |
| `ENCRYPTION_KEY`         | Encryption key (32 chars)    | —                       |
| `RATE_LIMIT_TTL`         | Rate limit TTL (seconds)     | `60`                    |
| `RATE_LIMIT_MAX`         | Rate limit max requests      | `100`                   |
| `CORS_ORIGIN`            | Allowed CORS origin          | `http://localhost:3000` |
| `BULL_QUEUE_PREFIX`      | BullMQ prefix                | `crm`                   |
| `PGADMIN_EMAIL`          | PgAdmin login email          | `admin@crm.com`         |
| `PGADMIN_PASSWORD`       | PgAdmin login password       | `Admin@123`             |
| `PGADMIN_PORT`           | PgAdmin port                 | `5050`                  |

---

## Security

- **JWT Authentication** — Access + Refresh token rotation
- **RBAC** — Role-Based Access Control (admin, manager, user)
- **Password Hashing** — bcrypt with 12 salt rounds
- **Input Validation** — Global validation pipe with whitelist
- **Rate Limiting** — Configurable per-endpoint rate limiting
- **CORS** — Configured allowed origins
- **Helmet** — Security HTTP headers
- **SQL Injection Protection** — Prisma parameterized queries
- **XSS Protection** — Input sanitization
- **Audit Logging** — Automatic audit trail for all mutations
- **Soft Delete** — Logical deletion pattern
- **Request ID** — Every request gets a unique ID for tracing

---

## Code Quality

- **TypeScript Strict Mode** — No implicit any, strict null checks
- **ESLint** — Configured with TypeScript rules
- **Prettier** — Consistent code formatting
- **EditorConfig** — Editor-agnostic configuration
- **Commitlint** — Conventional commit messages
- **Git Hooks** — Pre-commit linting via Husky + lint-staged

---

## Database

### Prisma Schema

Models: `Tenant`, `User`, `AuditLog`

Enums: `UserStatus`, `TenantStatus`, `SubscriptionPlan`

Features: UUID primary keys, unique constraints, foreign keys, composite indexes,
JSON fields (permissions, settings, metadata), timestamps, soft delete.

New business entities (Companies, Contacts, Leads, Pipelines, Deals, Tasks) will be
added in future stages.

---

## Development Workflow

```bash
# Development
pnpm dev                    # Start all (API + Web) in watch mode

# Build
pnpm build                  # Build all packages

# Testing
pnpm test                   # Run all tests
pnpm test:coverage          # With coverage

# Database
pnpm db:migrate             # Apply migrations
pnpm db:generate            # Generate Prisma client
pnpm db:seed                # Seed database

# Docker
pnpm docker:up              # Start infrastructure
pnpm docker:down            # Stop infrastructure
pnpm docker:build           # Build Docker images

# Linting
pnpm lint                   # Lint all packages

# Cleanup
pnpm clean                  # Clean build artifacts
```

---

## CI/CD

GitHub Actions workflows for:

- Linting and formatting checks
- Unit and integration tests
- Build verification
- Docker image building
- (Deployment configuration in future stages)

---

## Kubernetes

The project is structured to support Kubernetes deployment. Helm charts and K8s
manifests will be added in the infrastructure stages.

---

## Stage 1 — Foundation & Architecture

### Completed

- [x] Monorepo structure (pnpm + Turborepo)
- [x] Clean Architecture layers (Domain, Application, Infrastructure, Presentation, Shared)
- [x] NestJS backend with 14 modules (4 implemented + 10 stubs)
- [x] Next.js frontend with Admin Layout shell
- [x] JWT authentication (login, register, refresh, RBAC)
- [x] Prisma ORM with PostgreSQL (Tenant, User, AuditLog models)
- [x] Docker Compose (PostgreSQL, Redis, PgAdmin, API, Web, Nginx)
- [x] Swagger documentation
- [x] Health check endpoint
- [x] Global exception filter (HTTP + Prisma errors)
- [x] Request logging interceptor
- [x] Audit trail interceptor
- [x] Request ID middleware
- [x] Rate limiting (Throttler)
- [x] Security (Helmet, CORS, password hashing, input validation)
- [x] Soft delete pattern
- [x] Dark/Light theme
- [x] Observability structure (logging, metrics, tracing)
- [x] ESLint + Prettier + EditorConfig
- [x] Commitlint + Husky + lint-staged
- [x] Shared packages (shared, ui, config, types)
- [x] Seed script
- [x] README documentation
- [x] PgAdmin interface

---

## License

Proprietary — All rights reserved.
