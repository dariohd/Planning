import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://planning-black-xi.vercel.app";

export const metadata: Metadata = {
  title: "Planning Présence",
  description: "Gestion de planning d'équipes",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Planning",
    statusBarStyle: "default",
  },
  metadataBase: new URL(APP_URL),
};

export const viewport: Viewport = {
  themeColor: "#00205b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
