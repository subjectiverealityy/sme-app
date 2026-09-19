import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Ledgerly — Simple records. Smarter business.",
  description: "Keep track of your business money without the accounting headache.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#167C5A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#F8FAF9] text-[#17221D]">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
