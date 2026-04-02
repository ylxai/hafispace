import "./globals.css";

import type { Metadata } from "next";
import { Bonheur_Royale,Geist, Geist_Mono } from "next/font/google";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastProvider } from "@/components/ui/toast";

import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bonheurRoyale = Bonheur_Royale({
  variable: "--font-bonheur",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hafiportrait Platform",
  description: "Wedding and event photography platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bonheurRoyale.variable} antialiased`}
      >
        <ErrorBoundary>
          <Providers>
            <ToastProvider>
              {children}
            </ToastProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
