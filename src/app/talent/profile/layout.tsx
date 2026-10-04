import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil & Keahlian Talenta",
  description: "Kelola profil lengkap, portofolio, dan daftar keahlian untuk meningkatkan skor kecocokan proyek.",
};

export default function TalentProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
