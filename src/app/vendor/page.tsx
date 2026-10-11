import type { Metadata } from "next";
import { RoleBenefitsPage } from "@/components/role-benefits-page";

export const metadata: Metadata = {
  title: "Untuk Vendor",
  description:
    "Temukan manfaat Pathfolio untuk vendor: proses rekrutmen ringkas dan kandidat proyek yang lebih relevan.",
};

export default function VendorInformationPage() {
  return <RoleBenefitsPage role="vendor" />;
}
