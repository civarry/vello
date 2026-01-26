-- DropIndex (remove unique constraint to allow multiple configs per org)
DROP INDEX "smtp_configurations_organizationId_key";

-- AlterTable: Add new columns with defaults
ALTER TABLE "smtp_configurations" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "smtp_configurations" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Default';

-- Update existing configs to be default and have a proper name based on provider
UPDATE "smtp_configurations" sc
SET "isDefault" = true,
    "name" = COALESCE((SELECT ep.name FROM "email_providers" ep WHERE ep.id = sc."providerId"), 'Email Config')
WHERE EXISTS (SELECT 1 FROM "smtp_configurations");

-- Remove the default constraint now that existing rows are updated
ALTER TABLE "smtp_configurations" ALTER COLUMN "name" DROP DEFAULT;
