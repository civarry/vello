import Link from "next/link";
import Image from "next/image";
import { Home, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Background with gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.95_0.03_175)] via-[oklch(0.98_0.01_180)] to-[oklch(0.92_0.04_85)] dark:from-[oklch(0.14_0.03_200)] dark:via-[oklch(0.16_0.02_200)] dark:to-[oklch(0.18_0.04_175)]" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[oklch(0.55_0.12_175_/_0.08)] dark:bg-[oklch(0.55_0.12_175_/_0.15)] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[oklch(0.80_0.12_85_/_0.08)] dark:bg-[oklch(0.70_0.12_85_/_0.10)] rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/icon.png"
            alt="Vello"
            width={44}
            height={44}
            className="rounded-xl shadow-lg shadow-primary/25"
          />
          <span className="text-3xl font-bold tracking-tight text-foreground">
            Vello
          </span>
        </div>

        {/* 404 Card */}
        <div className="w-full max-w-md">
          <div className="bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-border/50 p-8">
            <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Page Not Found
            </h1>
            <p className="text-muted-foreground mb-8">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/signup">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-sm text-muted-foreground max-w-md">
          Vello is a professional HR payslip template builder and document
          generator for payroll teams.
        </p>
      </div>
    </div>
  );
}
