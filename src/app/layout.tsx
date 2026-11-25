import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { Navbar } from "@/components/navbar";

import { BrandLogo } from "@/components/brand-logo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CyberNexus Events | University Tech Club",
  description:
    "Official event ticketing, registration, and attendance verification system for the CyberNexus University Club.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen flex flex-col bg-cyber-bg text-foreground cyber-grid antialiased`}
      >
        <AppProviders>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground bg-background/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BrandLogo variant="full" className="h-5 w-auto text-primary" />
                <span className="text-muted-foreground/80">• University Club Events Platform</span>
              </div>
              <p>© {new Date().getFullYear()} CyberNexus. Built for Free Vercel & Supabase Deployment.</p>
            </div>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
