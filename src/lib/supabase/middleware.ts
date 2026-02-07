import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_GITHUB_API_ROUTES = new Set([
    "/api/github/issues",
    "/api/github/pull-requests",
    "/api/github/pull-request-files",
]);

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired - required for Server Components
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // GitHub proxy endpoints are intentionally allowed to be called from public pages (e.g. `/chat`).
    // Avoid middleware redirects that would turn these into HTML responses.
    const isPublicGitHubApiRoute = PUBLIC_GITHUB_API_ROUTES.has(pathname);

    if (isPublicGitHubApiRoute) {
        return supabaseResponse;
    }

    const isAuthRoute = pathname.startsWith("/auth");
    const isPublicRoute = pathname === "/" || pathname.startsWith("/login") || isAuthRoute;
    const bypassAuthRedirect = pathname.startsWith("/chat") ||
        pathname.startsWith("/interactables");

    // Protected routes - redirect to landing if not authenticated
    if (!user && !isPublicRoute && !bypassAuthRedirect) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from public pages to dashboard
    if (user && (pathname === "/" || pathname.startsWith("/login"))) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
