import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/url-validation";
import { NextResponse } from "next/server";

/**
 * Auth callback handler for Supabase.
 * Handles email confirmations and OAuth redirects.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = getSafeRedirectUrl(requestUrl.searchParams.get("next"));

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check if user has an organization
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                // We'll redirect to templates - the layout will handle onboarding redirect
                // if the user doesn't have an organization
                return NextResponse.redirect(new URL(next, requestUrl.origin));
            }
        }
    }

    // Auth failed, redirect to login with error
    return NextResponse.redirect(
        new URL("/login?error=auth_callback_error", requestUrl.origin)
    );
}
