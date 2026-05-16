import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/forms", "/builder", "/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check for the refresh token cookie (httpOnly, set by backend)
  // If it's absent the user has never authenticated — redirect to home
  const hasRefreshToken = request.cookies.has("refresh_token");
  if (!hasRefreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|f/|verify/).*)",
  ],
};
