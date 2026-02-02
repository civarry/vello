import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import { StructuredData } from "@/components/structured-data";
import { GoogleAnalytics } from "@/components/analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vello-mauve.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Vello - HR Payslip Template Builder & Document Generator",
    template: "%s | Vello",
  },
  description:
    "Design custom payslip templates with our drag-and-drop builder. Generate professional HR documents, manage employee payroll data, and distribute payslips with multi-send capabilities. Free payslip generator for businesses.",
  keywords: [
    "HR",
    "payroll",
    "payslip generator",
    "template builder",
    "document generation",
    "multi-send",
    "employee payslip",
    "payroll software",
    "HR documents",
    "payslip template",
  ],
  authors: [{ name: "Vello" }],
  creator: "Vello",
  publisher: "Vello",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Vello",
    title: "Vello - HR Payslip Template Builder & Document Generator",
    description:
      "Design custom payslip templates with our drag-and-drop builder. Generate professional HR documents and distribute payslips with multi-send capabilities.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vello - HR Payslip Template Builder & Document Generator",
    description:
      "Design custom payslip templates with our drag-and-drop builder. Generate professional HR documents and distribute payslips.",
    creator: "@velloapp",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: "Business Software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            // Offset below navbar (h-14 = 56px + 16px padding)
            offset={72}
            // Visual stacking distance between toasts
            visibleToasts={4}
            // Expand toasts on hover for easier interaction
            expand
          />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
