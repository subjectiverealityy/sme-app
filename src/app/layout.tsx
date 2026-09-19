import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PwaBanner } from "@/components/PwaBanner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "Credyt — Simple records. Smarter business.",
  description: "Keep track of your business money without the accounting headache.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Credyt — Simple records. Smarter business.",
    description: "Keep track of your business money without the accounting headache.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#29224e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#faf7f2] text-[#272047] font-sans">
        <StoreProvider>
          <AppShell>{children}</AppShell>
          <OfflineBanner />
          <PwaBanner />
        </StoreProvider>
      </body>
    </html>
  );
}
