import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PlannerProvider } from "./planner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3001";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "Clearpath — Debt Planner in Philippine Pesos",
    description: "An installable monthly debt payoff and obligations planner in Philippine pesos.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
    manifest: "/manifest.webmanifest",
    applicationName: "Clearpath",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Clearpath" },
    openGraph: {
      title: "Clearpath Debt Planner",
      description: "Know what’s due. Clear what’s next.",
      images: [{ url: new URL("/og.png", origin).toString(), width: 1728, height: 864, alt: "Clearpath debt planner dashboard" }],
    },
    twitter: { card: "summary_large_image", images: [new URL("/og.png", origin).toString()] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PlannerProvider>{children}</PlannerProvider>
      </body>
    </html>
  );
}
