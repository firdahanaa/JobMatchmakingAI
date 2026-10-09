import OnboardingPage from "../../onboarding/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Vendor",
  description: "Kelola informasi profil organisasi vendor.",
};

export default function VendorProfilePage() {
  return <OnboardingPage isProfilePage />;
}
