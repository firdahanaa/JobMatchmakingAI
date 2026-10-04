import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding Akun",
  description: "Lengkapi data profil awal organisasi vendor atau talenta muda Anda.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
