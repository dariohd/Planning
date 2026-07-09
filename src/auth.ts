import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { authConfig } from "@/auth.config";
import { envValue, isDemoLoginConfigured, safeEqual } from "@/lib/demo-auth";
import { prisma } from "@/lib/db";
import { nameFromEmail } from "@/lib/permissions";

const authUrl = envValue("AUTH_URL");
if (authUrl) process.env.AUTH_URL = authUrl;
else delete process.env.AUTH_URL;

const providers: Provider[] = [
  Credentials({
    id: "demo",
    name: "Compte démo",
    credentials: {
      username: { label: "Identifiant", type: "text" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const username = String(credentials?.username ?? "").trim();
      const password = String(credentials?.password ?? "");

      if (!username || !password) return null;

      const demoUsername = envValue("DEMO_USERNAME");
      const demoPassword = envValue("DEMO_PASSWORD");

      if (demoUsername && demoPassword && safeEqual(username, demoUsername) && safeEqual(password, demoPassword)) {
        const email = (process.env.DEMO_USER_EMAIL ?? `${username.toLowerCase()}@demo.planning.local`).toLowerCase();
        const role = envValue("DEMO_USER_ROLE") ?? "Lecteur";
        let personnelId: string | null = null;
        try {
          const demoPersonName = envValue("DEMO_PERSONNEL_NAME");
          if (demoPersonName) {
            const [prenom, ...rest] = demoPersonName.trim().split(/\s+/);
            const nom = rest.join(" ");
            const match = await prisma.personnel.findFirst({
              where: {
                prenom: { equals: prenom, mode: "insensitive" },
                nom: nom ? { equals: nom, mode: "insensitive" } : undefined,
              },
            });
            personnelId = match?.id ?? null;
          } else if (role === "REAP") {
            const key = username.toLowerCase().replace(/[^a-z]/g, "");
            const reaps = await prisma.personnel.findMany({ where: { role: "REAP" } });
            const match = reaps.find((p) => {
              const n = `${p.prenom}${p.nom}`.toLowerCase().replace(/[^a-z]/g, "");
              return n.includes(key) || key.includes(n);
            });
            personnelId = match?.id ?? null;
          }
          await prisma.user.upsert({
            where: { email },
            create: { email, role, name: username, personnelId },
            update: { role, name: username, ...(personnelId ? { personnelId } : {}) },
          });
        } catch (e) {
          console.error("Demo login DB sync skipped:", e);
        }
        return { id: email, email, name: username, role };
      }

      if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "true") {
        const devEmail = (process.env.DEV_USER_EMAIL ?? "admin@local.dev").toLowerCase();
        if (username === devEmail || username === "admin" || username === "admin@local.dev") {
          const user = await prisma.user.upsert({
            where: { email: devEmail },
            create: {
              email: devEmail,
              role: process.env.DEV_USER_ROLE ?? "Administrateur",
              name: nameFromEmail(devEmail),
            },
            update: {},
          });
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }
      }

      return null;
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

export const demoLoginEnabled = isDemoLoginConfigured();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account?.provider === "demo") return true;

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
