import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { nameFromEmail } from "@/lib/permissions";

const providers: Provider[] = [
  Credentials({
    name: "Dev",
    credentials: {
      email: { label: "Email", type: "email" },
    },
    async authorize(credentials) {
      if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_LOGIN) {
        return null;
      }
      const email = String(credentials?.email ?? process.env.DEV_USER_EMAIL ?? "admin@local.dev");
      const user = await prisma.user.upsert({
        where: { email: email.toLowerCase() },
        create: {
          email: email.toLowerCase(),
          role: process.env.DEV_USER_ROLE ?? "Administrateur",
          name: nameFromEmail(email),
        },
        update: {},
      });
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser && account?.provider === "google") {
        await prisma.user.create({
          data: {
            email,
            role: "Non Autorisé",
            name: user.name ?? nameFromEmail(email),
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        token.role = dbUser?.role ?? (user as { role?: string }).role ?? "Non Autorisé";
        token.email = user.email;
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: String(token.email).toLowerCase() } });
        token.role = dbUser?.role ?? "Non Autorisé";
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
});
