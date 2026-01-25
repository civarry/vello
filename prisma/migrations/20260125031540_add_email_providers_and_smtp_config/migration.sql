-- CreateTable
CREATE TABLE "email_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "smtpServer" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "useTLS" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,

    CONSTRAINT "email_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smtp_configurations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "smtpUsername" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_providers_name_key" ON "email_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "smtp_configurations_organizationId_key" ON "smtp_configurations"("organizationId");

-- CreateIndex
CREATE INDEX "smtp_configurations_organizationId_idx" ON "smtp_configurations"("organizationId");

-- AddForeignKey
ALTER TABLE "smtp_configurations" ADD CONSTRAINT "smtp_configurations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smtp_configurations" ADD CONSTRAINT "smtp_configurations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "email_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
