import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getSafeNextPath(nextParam: string) {
    const normalized = nextParam.trim();

    if (!normalized.startsWith("/")) {
        return "/";
    }

    if (normalized.startsWith("//") || normalized.includes("://") || normalized.includes("\\")) {
        return "/";
    }

    return normalized;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const nextParam = searchParams.get("next") ?? "/";
    const nextPath = getSafeNextPath(nextParam);

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${nextPath}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
