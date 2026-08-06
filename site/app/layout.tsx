import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ProgressSync } from "@/components/auth/ProgressSync";

// Archivo — siqiq, mustahkam grotesk. Inter emas.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  display: "swap",
});

// Monoshirift butun UI chrome'ini olib yuradi: ID, raqam, yorliq, chizma.
const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  // Yorliqda qisqa nom turadi — sahifa nomi uzun bo'lsa kesilib ketadi.
  title: "PROGPREP",
  description:
    "Backend intervyusida so'raladigan mavzular: chizma, kod va tayyor javoblar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${archivo.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh">
        <ProgressSync />
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
