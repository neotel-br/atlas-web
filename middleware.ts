import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { createI18nMiddleware } from "fumadocs-core/i18n";
import { i18n, locales } from "@/lib/i18n";

const i18nMiddleware = createI18nMiddleware(i18n);

// Paths that do not require authentication (locale prefix stripped before check).
const PUBLIC_PATHS = ["/login"];

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Strip the leading locale segment to inspect the logical path.
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const hasLocale = locales.includes(maybeLocale);
  const lang = hasLocale ? maybeLocale : i18n.defaultLanguage;
  const rest = "/" + (hasLocale ? segments.slice(1) : segments).join("/");

  const isPublic = PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));

  if (!isPublic) {
    // Auth.js v5 sets this cookie for an active JWT session.
    const hasSession =
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = `/${lang}/login`;
      return NextResponse.redirect(url);
    }
  }

  return i18nMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
