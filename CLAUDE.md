# Vello - Claude Code Guidelines

## Project Vision

Vello is a multi-tenant SaaS platform that enables companies to design custom payslip templates through a visual builder, then generate payslips by inputting employee data directly or via Excel import/export.

**Core Philosophy:** Design-first, not data-first. Companies create their payslip layout once, then reuse it every pay period.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand for global state, React Query for server state
- **Template Designer:** Custom block-based builder using @dnd-kit for drag-and-drop

### Backend
- **API:** Next.js API Routes (Route Handlers)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Auth:** Supabase Auth (supports org/team structures)
- **File Storage:** Supabase Storage (for logos, exports)

### PDF Generation
- **Primary:** React-PDF (@react-pdf/renderer) for server-side generation
- **Alternative:** Puppeteer for complex HTML-to-PDF if needed

### Deployment
- **Platform:** Vercel (frontend + API)
- **Database:** Supabase (managed Postgres)

---

## Project Structure

```
vello/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login, register, invite)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── templates/      # Template management
│   │   │   ├── payslips/       # Payslip generation
│   │   │   ├── employees/      # Employee management
│   │   │   └── settings/       # Company settings, members, audit-log
│   │   ├── api/                # API Route Handlers
│   │   │   ├── audit-logs/     # Audit log list & export
│   │   │   ├── invites/        # Invite management
│   │   │   ├── members/        # Team member CRUD
│   │   │   ├── smtp/           # Email configuration
│   │   │   ├── templates/      # Template CRUD & batch operations
│   │   │   └── organization/   # Org settings
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── template-builder/   # Template designer components
│   │   ├── audit-log/          # Audit log UI components
│   │   ├── payslip/            # Payslip preview & generation
│   │   └── shared/             # Shared components
│   ├── lib/
│   │   ├── db/                 # Prisma client & utilities
│   │   ├── pdf/                # PDF generation logic
│   │   ├── excel/              # Excel import/export (xlsx)
│   │   ├── audit.ts            # Audit logging utilities
│   │   ├── logging.ts          # Application logging
│   │   ├── permissions.ts      # RBAC permission checks
│   │   ├── errors.ts           # Error response helpers
│   │   └── utils/              # General utilities
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── hooks/                  # Custom React hooks
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
└── tests/
```

---

## Database Schema (Core Entities)

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  logo      String?
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  users     User[]
  templates Template[]
  employees Employee[]
  payslips  Payslip[]
}

model User {
  id             String       @id @default(cuid())
  email          String       @unique
  name           String?
  role           UserRole     @default(MEMBER)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
}

model Template {
  id             String       @id @default(cuid())
  name           String
  description    String?
  schema         Json         // Block layout definition
  paperSize      PaperSize    @default(A4)
  orientation    Orientation  @default(PORTRAIT)
  isDefault      Boolean      @default(false)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  payslips       Payslip[]
}

enum PaperSize {
  A4
  LETTER
  LEGAL
}

enum Orientation {
  PORTRAIT
  LANDSCAPE
}

model Employee {
  id             String       @id @default(cuid())
  employeeId     String       // Company's internal ID
  firstName      String
  lastName       String
  email          String?
  department     String?
  position       String?
  metadata       Json?        // Flexible additional fields
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  payslips       Payslip[]
  
  @@unique([organizationId, employeeId])
}

model Payslip {
  id             String       @id @default(cuid())
  periodStart    DateTime
  periodEnd      DateTime
  data           Json         // All payslip data (earnings, deductions, etc.)
  pdfUrl         String?      // Generated PDF storage URL
  templateId     String
  template       Template     @relation(fields: [templateId], references: [id])
  employeeId     String
  employee       Employee     @relation(fields: [employeeId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())
}
```

---

## Template Builder Architecture

### Block Types

```typescript
type BlockType =
  | 'header'        // Company logo, name, address
  | 'employee-info' // Employee details section
  | 'earnings'      // Earnings table (basic, allowances, OT, etc.)
  | 'deductions'    // Deductions table (tax, SSS, PhilHealth, etc.)
  | 'summary'       // Net pay summary
  | 'text'          // Custom text block
  | 'divider'       // Horizontal divider
  | 'spacer'        // Vertical spacing
  | 'footer';       // Footer with signatures, notes

interface Block {
  id: string;
  type: BlockType;
  properties: Record<string, unknown>; // Block-specific properties
  style: BlockStyle;
}

interface BlockStyle {
  marginTop?: number;
  marginBottom?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
}

interface TemplateSchema {
  blocks: Block[];
  variables: TemplateVariable[]; // Available placeholders
  globalStyles: {
    fontFamily: string;
    fontSize: number;
    primaryColor: string;
  };
}
```

### Variable System

Templates use placeholders that map to employee/payslip data:

```typescript
// Standard variables available in all templates
const STANDARD_VARIABLES = {
  // Employee
  '{{employee.id}}': 'Employee ID',
  '{{employee.firstName}}': 'First Name',
  '{{employee.lastName}}': 'Last Name',
  '{{employee.fullName}}': 'Full Name',
  '{{employee.department}}': 'Department',
  '{{employee.position}}': 'Position',
  
  // Period
  '{{period.start}}': 'Period Start Date',
  '{{period.end}}': 'Period End Date',
  '{{period.month}}': 'Pay Month',
  
  // Company
  '{{company.name}}': 'Company Name',
  '{{company.address}}': 'Company Address',
  '{{company.logo}}': 'Company Logo URL',
  
  // Computed (from payslip data)
  '{{earnings.total}}': 'Total Earnings',
  '{{deductions.total}}': 'Total Deductions',
  '{{netPay}}': 'Net Pay',
};
```

---

## Coding Standards

### General
- Use TypeScript strict mode, no `any` types
- Prefer named exports over default exports
- Use absolute imports with `@/` prefix
- Write JSDoc comments for complex functions
- Keep components under 200 lines; extract logic to hooks

### Components
- Use function components with TypeScript interfaces for props
- Colocate component-specific types in the same file
- Use `cn()` utility for conditional Tailwind classes
- Prefix client components with `'use client'` only when necessary

### API Routes
- Validate all inputs with Zod
- Return consistent response shapes: `{ data, error, message }`
- Use proper HTTP status codes
- Implement rate limiting for public endpoints

### Database
- Always use Prisma transactions for multi-table operations
- Include proper indexes for frequently queried fields
- Use soft deletes for important records (add `deletedAt` field)

### Error Handling
- Use custom error classes for different error types
- Log errors with context (user, org, action)
- Never expose internal errors to clients

---

## Design System

### Brand Colors (OKLCH)
- **Primary:** Rich teal (`oklch(0.45 0.12 175)`) — trust, reliability, financial
- **Accent:** Warm amber (`oklch(0.88 0.12 85)`) — highlights, CTAs
- **Destructive:** Red for delete/danger actions
- **Success:** Green (`oklch(0.60 0.16 145)`)

### Typography
- **Sans:** Geist Sans (via `next/font/google`)
- **Mono:** Geist Mono (for IDs, emails, code)

### Component Patterns
- Use shadcn/ui components as base
- Cards with `bg-muted/30` background for sections
- `divide-y divide-border/50` for list items within cards
- Badge variants: `default`, `secondary`, `outline`, `destructive`
- Icons from `lucide-react`, size `h-4 w-4` standard

### Sheet/Modal Patterns
- Use `SheetContent` with `px-6 py-6` for content padding
- Section headers: `text-sm font-medium flex items-center gap-2`
- Detail rows: label on left (muted), value on right (font-medium)

---

## RBAC & Permissions

### Roles
- **OWNER:** Full access, can transfer ownership, delete org
- **ADMIN:** Can manage members, templates, settings, view audit logs
- **MEMBER:** Can use templates, generate documents

### Permission Checks
```typescript
import { hasPermission } from "@/lib/permissions";

// In API routes
if (!hasPermission(context.currentMembership.role, "audit:read")) {
  return createForbiddenResponse("...");
}
```

### Key Permissions
- `template:*` — create, edit, delete, duplicate templates
- `member:*` — invite, remove, change roles
- `settings:*` — org settings, SMTP config
- `audit:read` — view and export audit logs (OWNER, ADMIN only)

---

## Audit Log System

### Location
- **Library:** `src/lib/audit.ts`
- **API:** `src/app/api/audit-logs/`
- **UI:** `src/app/(dashboard)/settings/audit-log/`
- **Components:** `src/components/audit-log/`

### Action Types
```typescript
type AuditAction =
  // Templates
  | "TEMPLATE_CREATED" | "TEMPLATE_EDITED" | "TEMPLATE_DELETED"
  | "TEMPLATE_DUPLICATED" | "TEMPLATE_SET_DEFAULT"
  // Documents
  | "DOCUMENT_GENERATED" | "DOCUMENT_BATCH_GENERATED"
  | "DOCUMENT_SENT" | "DOCUMENT_BATCH_SENT" | "EXCEL_IMPORTED"
  // Team
  | "MEMBER_INVITED" | "INVITE_REVOKED" | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED" | "OWNERSHIP_TRANSFERRED" | "MEMBER_LEFT"
  // Organization
  | "ORG_UPDATED" | "ORG_DELETED"
  // Settings
  | "SMTP_CONFIG_ADDED" | "SMTP_CONFIG_UPDATED" | "SMTP_CONFIG_DELETED"
  // Audit
  | "AUDIT_LOGS_EXPORTED";
```

### Usage Pattern
```typescript
import { logAuditEvent, createAuditUserContext } from "@/lib/audit";

await logAuditEvent({
  action: "TEMPLATE_CREATED",
  user: createAuditUserContext(context),
  resource: { type: "template", id: template.id, name: template.name },
  metadata: { /* action-specific details */ },
});
```

### Design Decisions
- **No IP tracking:** Unreliable (proxies, CDNs) and privacy concerns
- **No login/logout tracking:** High volume noise, Supabase handles auth logs
- **No failed action tracking:** Most failures are user errors, not security events
- **Graceful failures:** `logAuditEvent` never throws — won't break main flows
- **Structured metadata display:** No raw JSON in UI; use `extractDetails()` for context-aware rendering

---

## Logging System

### Location
- `src/lib/logging.ts`

### Usage
```typescript
import { logInfo, logWarn, logError } from "@/lib/logging";

logInfo("Action completed", { userId, action });
logWarn("Suspicious activity", { userId, reason });
logError("Operation failed", error, { context });
```

---

## MVP Scope (Phase 1) ✅ COMPLETED

### Must Have ✅
- [x] User authentication (email/password)
- [x] Organization creation & setup
- [x] Basic template builder with core blocks
- [x] Save/load templates
- [x] Manual payslip data entry form
- [x] PDF generation & download
- [x] Basic employee list

### Phase 2 ✅ COMPLETED
- [x] Excel import for bulk payslip data
- [x] Excel export of payslip data
- [x] Batch PDF generation
- [x] Email payslips to employees (SMTP config)
- [x] Template duplication
- [x] Payslip history & search

### Phase 3 ✅ COMPLETED
- [x] Team member invites & roles (RBAC)
- [x] Audit logs with export
- [x] Invite link system

### Future (Phase 4+)
- [ ] API access for integrations
- [ ] Payroll calculations engine
- [ ] White-label options

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run Prisma migrations
pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate

# Open Prisma Studio
pnpm prisma studio

# Build for production
pnpm build

# Run tests
pnpm test
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Notes for Claude

### General Approach
1. **Always check existing code** before creating new files to avoid duplication
2. **Follow the established patterns** in the codebase
3. **Ask clarifying questions** if requirements are ambiguous
4. **Suggest improvements** if you see better approaches
5. **Test critical paths** — especially PDF generation and data mapping

### UI/UX Guidelines
6. **Keep the UX simple** — add power features later, not upfront
7. **Use the frontend-design skill** for UI work to maintain design consistency
8. **Check mobile responsiveness** — app is used on various devices
9. **Prefer structured displays over raw data** — no JSON dumps in user-facing UI

### Domain Context
10. **Philippine payroll context**: Common deductions include SSS, PhilHealth, Pag-IBIG, and withholding tax
11. **Multi-tenant aware**: Always scope queries by `organizationId`
12. **RBAC enforcement**: Check permissions in API routes using `hasPermission()`

### Code Quality
13. **Sync related code**: When adding new action types, update both `src/lib/audit.ts` AND the filter dropdown in the UI
14. **Graceful degradation**: Audit logging and non-critical operations should never break main user flows
15. **Use existing utilities**: `createAuditUserContext()`, `logInfo/Warn/Error()`, `cn()` for Tailwind classes

### What NOT to Build
- IP address tracking (privacy concerns, unreliable)
- Login/logout audit events (handled by Supabase, high noise)
- Failed action tracking (user errors, not security)
