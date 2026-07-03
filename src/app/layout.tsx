import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://rankforge.app"),
  title: {
    default: "RankForge — Etsy SEO made simple",
    template: "%s | RankForge"
  },
  description:
    "Keyword research, tag generation, listing analysis, and trend discovery for Etsy sellers. Be seen. Then soar.",
  openGraph: {
    title: "RankForge — Etsy SEO made simple",
    description: "Keyword research, tag generation, listing analysis, and trend discovery for Etsy sellers.",
    type: "website",
    siteName: "RankForge"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
