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
    default: "MatchWork AI — Platform Matchmaking Talenta & Proyek Cerdas",
    template: "%s | MatchWork AI",
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
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-purple-600 selection:text-white">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
