import { NextResponse, type NextRequest } from "next/server";
import { isUnlocked, UNLOCK_COOKIE } from "@/lib/passcode";

// Only active when TEAM_PASSCODE is set: asks for it once at /unlock.
export async function proxy(request: NextRequest) {
  if (!process.env.TEAM_PASSCODE) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/unlock")) return NextResponse.next();
  if (await isUnlocked(request.cookies.get(UNLOCK_COOKIE)?.value)) return NextResponse.next();

  // Remember where the person was going (e.g. a shared /form link).
  const url = request.nextUrl.clone();
  const target = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/unlock";
  url.search = target === "/" ? "" : `?next=${encodeURIComponent(target)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
