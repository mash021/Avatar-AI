import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/layout/Header";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Avatar",
  description: "Bilingual AI-powered interactive avatar assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
