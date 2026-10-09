import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pathfolio — Temukan Proyek yang Cocok dengan Keahlianmu",
    template: "%s | Pathfolio",
  },
  description:
    "Platform matchmaking proyek freelance dan volunteer yang mempertemukan talenta muda dengan UMKM & startup, didukung skor kecocokan cerdas dan analisis skill gap transparan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#F0F9FF] text-[#0F172A] selection:bg-sky-500 selection:text-white"
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
