# CRM Enterprise

Enterprise CRM system inspired by Kommo, HubSpot, Salesforce and Pipedrive.

## Tech Stack

### Backend
- **Framework:** NestJS 10
- **Language:** TypeScript 5
- **ORM:** Prisma 5
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Queue:** BullMQ
- **Auth:** JWT + Refresh Token + RBAC
- **Docs:** Swagger
- **WebSocket:** Socket.IO

### Frontend
- **Framework:** Next.js 14
- **Library:** React 18
- **Styling:** Tailwind CSS 3 + Shadcn UI
- **State:** Zustand + React Query
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion

### Infrastructure
- **Container:** Docker + Docker Compose
- **Web Server:** Nginx
- **Monorepo:** pnpm + Turbo

## Project Structure

```
CRM/
├── apps/
│   ├── api/                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── common/       # Guards, Filters, Interceptors, Decorators
│   │   │   ├── config/       # Configuration types
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── auth/     # Authentication
│   │   │   │   ├── users/    # User management
│   │   │   │   ├── tenants/  # Tenant management
│   │   │   │   └── health/   # Health check
│   │   │   └── prisma/       # Database service
│   │   └── prisma/           # Schema & Migrations
│   └── web/                  # Next.js Frontend
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # React components
│           ├── lib/          # Utilities & API client
│           └── stores/       # Zustand stores
├── packages/
│   └── shared/               # Shared types & constants
├── docker/                   # Docker configs
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Installation

```bash
pnpm install
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Start infrastructure
docker compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Seed database
pnpm --filter @crm/api db:seed

# Start development
pnpm dev
```

### With Docker

```bash
# Build and start all services
docker compose up -d --build

# Run migrations
docker compose exec api pnpm db:migrate

# Seed
docker compose exec api pnpm db:seed
```

### Access
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **Swagger:** http://localhost:3001/api/docs
- **Prisma Studio:** `pnpm --filter @crm/api db:studio`

### Default Credentials
- **Email:** admin@crm.com
- **Password:** Admin@123

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login | User login |
| POST | /api/v1/auth/register | User registration |
| POST | /api/v1/auth/refresh | Refresh token |
| POST | /api/v1/auth/logout | User logout |
| GET | /api/v1/auth/profile | Get profile |
| POST | /api/v1/auth/change-password | Change password |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/users | List users |
| GET | /api/v1/users/:id | Get user |
| POST | /api/v1/users | Create user (admin) |
| PUT | /api/v1/users/:id | Update user (admin) |
| DELETE | /api/v1/users/:id | Delete user (admin) |

### Tenants
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/tenants/current | Get current tenant |
| GET | /api/v1/tenants/current/stats | Get tenant stats |
| GET | /api/v1/tenants/:slug | Get tenant by slug |
| PUT | /api/v1/tenants/current | Update tenant (admin) |
| DELETE | /api/v1/tenants/:id | Delete tenant (admin) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/health | Health check |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| API_PORT | API port | 3001 |
| WEB_PORT | Web port | 3000 |
| DATABASE_URL | PostgreSQL URL | postgresql://... |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| JWT_SECRET | JWT secret | - |
| JWT_REFRESH_SECRET | JWT refresh secret | - |
| JWT_EXPIRATION | Token expiration | 15m |
| JWT_REFRESH_EXPIRATION | Refresh expiration | 7d |
| CORS_ORIGIN | Allowed origin | http://localhost:3000 |
| RATE_LIMIT_TTL | Rate limit TTL (s) | 60 |
| RATE_LIMIT_MAX | Rate limit max | 100 |

## Architecture

- **Clean Architecture** - Separation of concerns, dependency inversion
- **DDD** - Domain-Driven Design principles
- **SOLID** - Single Responsibility, Open-Closed, Liskov, Interface Segregation, Dependency Inversion
- **Repository Pattern** - Data access abstraction
- **CQRS Ready** - Prepared for Command Query Responsibility Segregation
- **Event-Driven** - Prepared for event-based communication

## Security

- JWT authentication with access and refresh tokens
- Role-Based Access Control (RBAC)
- Password hashing with bcrypt (12 rounds)
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and transformation
- SQL injection protection via Prisma
- XSS protection
- Audit logging

## Stage 1 - Foundation

- [x] Monorepo structure with pnpm + Turbo
- [x] NestJS backend with modular architecture
- [x] Prisma schema with User, Tenant, Audit models
- [x] JWT authentication with refresh tokens
- [x] Role-Based Access Control
- [x] Next.js frontend with Tailwind + Shadcn UI
- [x] Dark/Light mode
- [x] Docker Compose with PostgreSQL, Redis, API, Web
- [x] Health check endpoint
- [x] Swagger documentation
- [x] Global exception filter
- [x] Logging interceptor
- [x] Audit interceptor
- [x] Rate limiting
- [x] CORS + Helmet
- [x] Soft delete
- [x] Seed script
