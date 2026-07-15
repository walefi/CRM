# CRM Enterprise - Project Progress

## Stage 18 — Quotes Module (Propostas Comerciais)

### Date: 2026-07-15

### Summary

Implemented complete Quotes/Propostas Comerciais module with items, versions, templates,
and full CRUD operations. Integrated with Deals, Companies, Contacts, Products, Timeline,
and Activities engines.

### Files Created

- `apps/api/src/modules/quotes/dto/quotes.dto.ts` — DTOs with validators
- `apps/api/src/modules/quotes/quotes.service.ts` — Service with calculations, versioning, exports
- `apps/api/src/modules/quotes/quotes.controller.ts` — Controller with 20+ endpoints
- `apps/api/src/modules/quotes/quotes.module.ts` — Module definition
- `apps/web/src/app/quotes/page.tsx` — Full quotes page (table + cards + filters)
- `apps/web/src/app/quotes/quote-drawer.tsx` — Drawer for create/edit/preview/versions

### Files Modified

- `apps/api/prisma/schema.prisma` — Enhanced Quote, added QuoteItem, QuoteVersion, QuoteTemplate, QuoteStatus enum
- `apps/api/src/app.module.ts` — Registered QuotesModule

### Database Changes

- **New Models:** QuoteItem, QuoteVersion, QuoteTemplate
- **Enhanced Model:** Quote (title, description, currency, subtotal, discount, taxes, shipping, margin, paymentTerms, commercialConditions, internalNotes, customerNotes, tags, isFavorite, isArchived, companyId, contactId, teamId, createdBy, metadata)
- **New Enum:** QuoteStatus (DRAFT, UNDER_REVIEW, SENT, VIEWED, NEGOTIATION, ACCEPTED, REJECTED, EXPIRED, CANCELLED, ARCHIVED)
- **Modified:** Activity (added quoteId), Company (added quotes[]), Contact (added quotes[]), Team (added quotes[]), Product (replaced quotes[] with quoteItems[])

### API Endpoints (20)

| Method | Path                                    | Description                    |
| ------ | --------------------------------------- | ------------------------------ |
| GET    | /quotes                                 | List with pagination & filters |
| GET    | /quotes/stats                           | Dashboard statistics           |
| GET    | /quotes/templates                       | List templates                 |
| POST   | /quotes/templates                       | Create template                |
| PATCH  | /quotes/templates/:id                   | Update template                |
| DELETE | /quotes/templates/:id                   | Delete template                |
| GET    | /quotes/export/:id                      | Export (json/csv)              |
| GET    | /quotes/:id                             | Get with items/versions        |
| POST   | /quotes                                 | Create with items              |
| PATCH  | /quotes/:id                             | Update                         |
| DELETE | /quotes/:id                             | Soft delete                    |
| POST   | /quotes/:id/archive                     | Archive                        |
| POST   | /quotes/:id/restore                     | Restore                        |
| POST   | /quotes/:id/duplicate                   | Duplicate                      |
| POST   | /quotes/:id/send                        | Send to customer               |
| POST   | /quotes/:id/items                       | Add item                       |
| PATCH  | /quotes/:id/items/:itemId               | Update item                    |
| DELETE | /quotes/:id/items/:itemId               | Remove item                    |
| POST   | /quotes/:id/items/reorder               | Reorder items                  |
| GET    | /quotes/:id/versions                    | Version history                |
| POST   | /quotes/:id/versions/:versionId/restore | Restore version                |

### Backend Components

- QuotesService — Full CRUD, calculations (subtotal, discount, taxes, total), versioning, reordering, exports
- QuotesController — 20 endpoints with JWT, Tenant, RBAC guards
- QuotesModule — Proper NestJS module
- DTOs — CreateQuoteDto, UpdateQuoteDto, QuoteFilterDto, CreateQuoteItemDto, UpdateQuoteItemDto, CreateQuoteTemplateDto

### Frontend Components

- QuotesPage — List with table/card views, search, status filter, pagination
- QuoteDrawer — Create/edit form with company/contact/deal selectors, items editor, preview, version history
- QuotePreview — Print-ready preview layout
- VersionHistory — Collapsible version list with restore capability

### Build Status

- Backend: OK (nest build — no errors)
- Frontend: OK (next build — no errors)
- Prisma Generate: OK
- TypeScript: OK (strict mode)

### Issues Found

- Docker not running (PostgreSQL unavailable for migration)
- Migration file pending (will be created when Docker is available)

### Issues Fixed

- Prisma schema validation errors resolved
- TypeScript type errors in service (Decimal, Json, enum types)
- ESLint issues in frontend files (unused imports, unused vars)

### Next Step

Stage 19 — Contracts

---
