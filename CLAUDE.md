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
│   │   ├── (auth)/             # Auth routes (login, register, etc.)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── templates/      # Template management
│   │   │   ├── payslips/       # Payslip generation
│   │   │   ├── employees/      # Employee management
│   │   │   └── settings/       # Company settings
│   │   ├── api/                # API Route Handlers
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── template-builder/   # Template designer components
│   │   │   ├── canvas/         # Main canvas area
│   │   │   ├── blocks/         # Draggable block components
│   │   │   ├── sidebar/        # Block palette & properties panel
│   │   │   └── toolbar/        # Top toolbar (save, preview, etc.)
│   │   ├── payslip/            # Payslip preview & generation
│   │   └── shared/             # Shared components
│   ├── lib/
│   │   ├── db/                 # Prisma client & utilities
│   │   ├── pdf/                # PDF generation logic
│   │   ├── excel/              # Excel import/export (xlsx)
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

## MVP Scope (Phase 1)

### Must Have
- [ ] User authentication (email/password)
- [ ] Organization creation & setup
- [ ] Basic template builder with core blocks:
  - Header (logo, company name, address)
  - Employee info section
  - Earnings table (configurable rows)
  - Deductions table (configurable rows)
  - Summary (net pay)
- [ ] Save/load templates
- [ ] Manual payslip data entry form
- [ ] PDF generation & download
- [ ] Basic employee list

### Nice to Have (Phase 2)
- [ ] Excel import for bulk payslip data
- [ ] Excel export of payslip data
- [ ] Batch PDF generation
- [ ] Email payslips to employees
- [ ] Template duplication
- [ ] Payslip history & search

### Future (Phase 3+)
- [ ] Team member invites & roles
- [ ] API access for integrations
- [ ] Payroll calculations engine
- [ ] Audit logs
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

1. **Always check existing code** before creating new files to avoid duplication
2. **Follow the established patterns** in the codebase
3. **Ask clarifying questions** if requirements are ambiguous
4. **Suggest improvements** if you see better approaches
5. **Test critical paths** — especially PDF generation and data mapping
6. When working on the template builder, **keep the UX simple** — we can add power features later
7. **Philippine payroll context**: Be aware of common deductions like SSS, PhilHealth, Pag-IBIG, and withholding tax
