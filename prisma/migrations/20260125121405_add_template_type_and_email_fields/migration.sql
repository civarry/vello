-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('PAYROLL', 'GENERAL');

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "recipientEmailField" TEXT,
ADD COLUMN     "recipientNameField" TEXT,
ADD COLUMN     "templateType" "TemplateType" NOT NULL DEFAULT 'PAYROLL';
