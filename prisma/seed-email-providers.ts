import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedEmailProviders() {
    console.log("Seeding email providers...");

    const providers = [
        {
            name: "Gmail",
            smtpServer: "smtp.gmail.com",
            smtpPort: 587,
            useTLS: true,
            description: "Google Gmail SMTP server. Requires app-specific password.",
        },
        {
            name: "Outlook",
            smtpServer: "smtp-mail.outlook.com",
            smtpPort: 587,
            useTLS: true,
            description: "Microsoft Outlook/Hotmail SMTP server.",
        },
        {
            name: "Custom",
            smtpServer: "smtp.example.com",
            smtpPort: 587,
            useTLS: true,
            description: "Custom SMTP server. Configure your own server settings.",
        },
    ];

    for (const provider of providers) {
        await prisma.emailProvider.upsert({
            where: { name: provider.name },
            update: provider,
            create: provider,
        });
        console.log(`✓ Seeded provider: ${provider.name}`);
    }

    console.log("Email providers seeded successfully!");
}

seedEmailProviders()
    .catch((error) => {
        console.error("Error seeding email providers:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
