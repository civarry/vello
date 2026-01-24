-- Migration: Multi-Organization Membership
-- This migration converts from single-org-per-user to multi-org membership model

-- Step 1: Create OrganizationMember table
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create Invite table
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add currentOrganizationId to User (nullable initially)
ALTER TABLE "User" ADD COLUMN "currentOrganizationId" TEXT;

-- Step 4: Migrate existing User data to OrganizationMember
-- Create membership records from existing user-organization relationships
INSERT INTO "OrganizationMember" ("id", "role", "joinedAt", "userId", "organizationId")
SELECT
    gen_random_uuid()::text,
    "role",
    "createdAt",
    "id",
    "organizationId"
FROM "User"
WHERE "organizationId" IS NOT NULL;

-- Step 5: Set currentOrganizationId to the existing organizationId
UPDATE "User" SET "currentOrganizationId" = "organizationId" WHERE "organizationId" IS NOT NULL;

-- Step 6: Drop old columns from User
-- First drop the foreign key constraint
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_organizationId_fkey";

-- Drop the index
DROP INDEX IF EXISTS "User_organizationId_idx";

-- Drop the columns
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" DROP COLUMN "organizationId";

-- Step 7: Create indexes for OrganizationMember
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- Step 8: Create indexes for Invite
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
CREATE INDEX "Invite_token_idx" ON "Invite"("token");
CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");

-- Step 9: Add foreign key constraints for OrganizationMember
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Add foreign key constraints for Invite
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
