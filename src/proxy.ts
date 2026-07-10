import { auth } from "@/auth.edge";

export default auth((req) => {
  if (!req.auth && !req.nextUrl.pathname.startsWith("/login")) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(login);
  }
});

export const config = {
  matcher: ["/desktop/:path*", "/mobile/:path*"],
};
