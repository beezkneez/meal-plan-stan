import type { Metadata } from "next";
import { DM_Sans, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NavSidebar } from "@/components/nav-sidebar";
import { AuthGate } from "@/components/auth-gate";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal Plan Stan",
  description:
    "Smart meal planning for shift workers — schedule-aware, leftover-friendly, health-focused.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} ${geistMono.variable} h-full`}
    >
      <body className="noise-bg min-h-full antialiased">
        <Providers>
          <NavSidebar />
          <main className="md:pl-72">
            <div className="mx-auto max-w-6xl p-5 md:p-10">
              <AuthGate>{children}</AuthGate>
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
