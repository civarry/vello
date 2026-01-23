import { Building2 } from "lucide-react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
                <Building2 className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">Vello</span>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
                    {children}
                </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-sm text-muted-foreground">
                Template-based document generation platform
            </p>
        </div>
    );
}
