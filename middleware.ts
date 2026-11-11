import { NextResponse, type NextRequest } from "next/server";

/** Route gate: redirects to /login when the session cookie is missing. The cookie is set client-side after sign-in; replace with server-validated sessions when a backend exists. */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("pulse-session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
