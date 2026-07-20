import { auth } from "@/auth.edge";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export default auth((req) => {
  if (!req.auth && !req.nextUrl.pathname.startsWith("/login")) {
    const login = new URL("/login", req.nextUrl.origin);
    const target = safeCallbackUrl(`${req.nextUrl.pathname}${req.nextUrl.search}`);
    login.searchParams.set("callbackUrl", target);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/desktop/:path*", "/mobile/:path*"],
};
