# Vello Changelog

## Overview

Vello is a multi-tenant SaaS platform for designing custom payslip templates and generating payslips. This document tracks all development progress.

---

## [0.2.0] - 2026-01-21

### API Routes (Production Ready)

#### Template CRUD Endpoints
- `GET /api/templates` - List all templates for organization
- `POST /api/templates` - Create new template with Zod validation
- `GET /api/templates/[id]` - Fetch single template
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template

#### PDF Export Endpoints
- `GET /api/templates/[id]/export` - Export saved template as PDF
- `POST /api/templates/export` - Export unsaved template data as PDF

### Features Implemented
- [x] **Save to Database**: Full CRUD operations with Prisma
- [x] **Template Loading**: Edit existing templates with auto-load from database
- [x] **PDF Export**: Generate PDF using @react-pdf/renderer
- [x] **Toast Notifications**: Sonner integration for user feedback
- [x] **Delete Confirmation**: Alert dialog for template deletion
- [x] **Duplicate Template**: Clone existing templates
- [x] **Error Handling**: Zod validation on all API endpoints

### Template List Page
- Real-time data fetching from API
- Template cards with metadata (paper size, orientation, updated date)
- Dropdown menu: Edit, Duplicate, Delete
- Loading states and empty states
- Delete confirmation dialog

### Template Edit Page
- Dynamic route `/templates/[id]/edit`
- Auto-load template data into builder store
- Error handling with redirect to templates list
- Loading state while fetching

### Validation Schemas (Zod)
```typescript
// Block style schema
blockStyleSchema: marginTop, fontSize, fontWeight, textAlign, etc.

// Block schema
blockSchema: id, type, properties, style

// Template schema
templateSchemaValidator: blocks[], variables[], globalStyles

// Create/Update schemas
createTemplateSchema: name, description, schema, paperSize, orientation
updateTemplateSchema: All fields optional (partial)
```

### Files Added
```
src/
├── app/
│   ├── (dashboard)/templates/
│   │   ├── page.tsx              # Updated: Real data, CRUD actions
│   │   └── [id]/edit/page.tsx    # NEW: Edit existing template
│   ├── api/templates/
│   │   ├── route.ts              # NEW: GET list, POST create
│   │   ├── export/route.ts       # NEW: POST export unsaved
│   │   └── [id]/
│   │       ├── route.ts          # NEW: GET, PUT, DELETE
│   │       └── export/route.ts   # NEW: GET export saved
├── lib/
│   ├── pdf/
│   │   └── template-pdf.tsx      # NEW: React PDF components
│   └── validations/
│       └── template.ts           # NEW: Zod schemas
└── components/ui/
    └── alert-dialog.tsx          # NEW: shadcn component
```

---

## [0.1.0] - 2026-01-21

### Project Setup
- Initialized Next.js 16 with TypeScript, Tailwind CSS 4, App Router
- Configured shadcn/ui component library (15 components installed)
- Set up Prisma 7 ORM with PostgreSQL adapter
- Integrated Supabase for authentication and storage
- Created project folder structure per CLAUDE.md specifications

### Database Schema
- **Organization**: Multi-tenant support with slug, logo, address
- **User**: Email auth with roles (OWNER, ADMIN, MEMBER)
- **Template**: JSON schema storage, paper size, orientation
- **Employee**: Company employee records with metadata
- **Payslip**: Generated payslips with PDF storage URL

### Template Builder (Core Feature)

#### Block Types (Fully Customizable)
| Block | Description | Properties |
|-------|-------------|------------|
| Text | Headings, paragraphs, labels | content, placeholder |
| Table | Dynamic rows/columns | rows, showBorders, stripedRows, headerBackground |
| Image | Logo or images | src, alt, width, height, objectFit |
| Container | Group elements | direction, gap, justifyContent, alignItems |
| Divider | Horizontal line | thickness, color, style |
| Spacer | Empty space | height |

#### Style System (All Blocks)
- **Typography**: fontSize, fontWeight, textAlign, color, lineHeight
- **Spacing**: padding (T/R/B/L), margin (T/R/B/L)
- **Background & Border**: backgroundColor, borderWidth, borderColor, borderRadius, borderStyle

#### Features Implemented
- [x] Drag-and-drop from palette to canvas (@dnd-kit)
- [x] Block reordering via drag
- [x] Inline text editing (double-click)
- [x] Inline table cell editing (double-click)
- [x] Add/remove table rows and columns
- [x] Block selection with visual feedback
- [x] Block duplication
- [x] Block deletion
- [x] Properties panel with Content/Style tabs
- [x] Paper size selection (A4, Letter, Legal)
- [x] Orientation selection (Portrait, Landscape)
- [x] Canvas resizes based on paper settings
- [x] Template name editing
- [x] Unsaved changes indicator
- [x] Preview modal with scaled rendering
- [x] SSR disabled for dnd-kit hydration fix

### State Management
- Zustand store for template builder state
- Actions: add, update, remove, reorder, duplicate blocks
- Table-specific actions: addRow, removeRow, addColumn, removeColumn, updateCell
- Paper/orientation settings synced to store
- loadTemplate action for edit mode
- reset action for cleanup

---

## Complete File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout with sidebar
│   │   ├── templates/
│   │   │   ├── page.tsx            # Template list with CRUD
│   │   │   ├── new/page.tsx        # New template builder
│   │   │   └── [id]/edit/page.tsx  # Edit existing template
│   │   ├── payslips/page.tsx
│   │   ├── employees/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── templates/
│   │       ├── route.ts            # List & Create
│   │       ├── export/route.ts     # Export unsaved
│   │       └── [id]/
│   │           ├── route.ts        # Get, Update, Delete
│   │           └── export/route.ts # Export saved
│   ├── layout.tsx                  # Root layout with Toaster
│   └── page.tsx                    # Redirects to /templates
├── components/
│   ├── ui/                         # shadcn/ui (15 components)
│   ├── template-builder/
│   │   ├── index.tsx
│   │   ├── toolbar/builder-toolbar.tsx
│   │   ├── sidebar/
│   │   │   ├── block-palette.tsx
│   │   │   └── properties-panel.tsx
│   │   ├── canvas/builder-canvas.tsx
│   │   └── blocks/
│   │       ├── block-renderer.tsx
│   │       ├── block-preview.tsx
│   │       ├── text-block.tsx
│   │       ├── table-block.tsx
│   │       ├── image-block.tsx
│   │       ├── container-block.tsx
│   │       ├── divider-block.tsx
│   │       └── spacer-block.tsx
│   └── shared/sidebar.tsx
├── stores/
│   └── template-builder-store.ts
├── types/
│   ├── template.ts
│   ├── payslip.ts
│   └── index.ts
├── lib/
│   ├── db/prisma.ts
│   ├── pdf/template-pdf.tsx        # React PDF renderer
│   ├── validations/template.ts     # Zod schemas
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils.ts
└── middleware.ts
```

---

## Pending Features

### High Priority
- [ ] Authentication flow (login/register)
- [ ] Organization setup

### Medium Priority
- [ ] Variable system for dynamic data
- [ ] Payslip data entry form
- [ ] Employee management CRUD

### Low Priority
- [ ] Excel import/export
- [ ] Batch PDF generation
- [ ] Email payslips to employees
- [ ] Audit logs

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 7 |
| PDF | @react-pdf/renderer |
| Validation | Zod |
| DnD | @dnd-kit |
| Notifications | Sonner |

---

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```
