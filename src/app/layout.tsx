import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vello",
  description: "Design custom payslip templates and generate documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
