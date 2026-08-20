import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/api/auth");
  const isHqRoute = path.startsWith("/hq");
  const isClientRoute = path.startsWith("/client");
  const isProtectedRoute = isHqRoute || isClientRoute;

  // If Supabase credentials are not configured, redirect to login with notification
  if (!env.isConfigured()) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
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

  // Authenticate user via Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated user attempting to access protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Resolve role from metadata or query database profile
    let role = user.user_metadata?.role || (user.app_metadata?.role as string);

    if (!role) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      role = (profile as { role?: string } | null)?.role || "CLIENT";
    }

    // Authenticated user attempting to access /login
    if (isAuthRoute && !path.startsWith("/api/auth")) {
      const targetPath = role === "CLIENT" ? "/client" : "/hq";
      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    // Prevent CLIENT role from accessing /hq or any /hq/* route
    if (isHqRoute && role === "CLIENT") {
      return NextResponse.redirect(new URL("/client", request.url));
    }

    // Prevent SUPER_ADMIN role from accessing /client
    if (isClientRoute && role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/hq", request.url));
    }
  }

  return supabaseResponse;
}
