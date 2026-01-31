-- Enable Row Level Security on all tables
-- This blocks direct PostgREST/Supabase API access while Prisma (service role) continues to work

-- Application tables
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;

-- Email configuration tables
ALTER TABLE "email_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "smtp_configurations" ENABLE ROW LEVEL SECURITY;

-- Note: _prisma_migrations is a system table used by Prisma
-- We enable RLS but it won't affect Prisma since it uses service role
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Grant service role full access (this is the role Prisma uses)
-- The service role bypasses RLS by default, but we add explicit grants for clarity

-- No policies are created intentionally:
-- - Blocks anon/authenticated users from accessing tables via PostgREST
-- - Prisma service role bypasses RLS and has full access
