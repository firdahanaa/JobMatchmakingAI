import type { Metadata } from "next";
import { RoleBenefitsPage } from "@/components/role-benefits-page";

export const metadata: Metadata = {
  title: "Untuk Talent",
  description:
    "Temukan manfaat Pathfolio untuk talent: proyek relevan, match score transparan, panduan skill gap, dan portofolio terverifikasi.",
};

export default function TalentInformationPage() {
  return <RoleBenefitsPage role="talent" />;
}
