import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk ke Akun",
  description: "Masuk ke Pathfolio untuk menemukan proyek yang cocok dengan keahlianmu.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
