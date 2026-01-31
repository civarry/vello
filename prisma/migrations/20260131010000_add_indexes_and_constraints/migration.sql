-- Safe migration: Add missing index and foreign key for User.currentOrganizationId

-- Add index for User.currentOrganizationId (improves JOIN performance)
CREATE INDEX IF NOT EXISTS "User_currentOrganizationId_idx" ON "User"("currentOrganizationId");

-- Add foreign key constraint for User.currentOrganizationId -> Organization.id
-- First, clean up any orphaned references (set to NULL if org doesn't exist)
UPDATE "User" SET "currentOrganizationId" = NULL
WHERE "currentOrganizationId" IS NOT NULL
AND "currentOrganizationId" NOT IN (SELECT id FROM "Organization");

-- Add the foreign key constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_currentOrganizationId_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_currentOrganizationId_fkey"
    FOREIGN KEY ("currentOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
  END IF;
END $$;
