import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/login") || path.startsWith("/api/auth")) return true;
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.role = (token.role as string) ?? "Non Autorisé";
      }
      return session;
    },
  },
  providers: [],
  session: { strategy: "jwt" },
  trustHost: true,
} satisfies NextAuthConfig;
