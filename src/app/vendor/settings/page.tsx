import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { VendorPageNavigation } from "@/components/vendor/vendor-page-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCompanyWorkspaceOverview } from "../company-actions";
import { createClient } from "@/lib/supabase/server";
import { Shield, Building2, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Pengaturan Workspace Perusahaan",
  description: "Pengaturan keamanan, privasi dokumen, dan konfigurasi workspace HR.",
};

export default async function VendorSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: overview } = await getCompanyWorkspaceOverview();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <VendorPageNavigation activePage="settings" />

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4a3728]">
              Pengaturan Workspace &amp; Keamanan Rekrutmen
            </h1>
            <p className="text-xs sm:text-sm text-[#7a6559] mt-0.5">
              Konfigurasi tingkat perusahaan, isolasi dokumen kandidat, dan kebijakan perlindungan riwayat seleksi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-5 w-5 text-[#C98B75]" />
                  <h2 className="font-bold text-sm text-[#4a3728]">Identitas Workspace</h2>
                </div>
                <Badge variant="success" className="text-2xs capitalize">
                  {overview?.company.status || "active"}
                </Badge>
              </div>
              <p className="text-xs text-[#7a6559] leading-relaxed">
                Nama Perusahaan: <strong className="text-[#4a3728]">{overview?.company.name || "Organisasi Vendor"}</strong>
              </p>
              <div className="pt-2">
                <Link href="/vendor/profile">
                  <Button variant="outline" size="sm" className="text-xs">
                    Ubah Profil Perusahaan
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-sm text-[#4a3728]">Perlindungan Data &amp; RLS</h2>
              </div>
              <ul className="space-y-1.5 text-xs text-[#7a6559]">
                <li>• Snapshot CV kandidat bersifat <strong>immutable</strong> per lamaran.</li>
                <li>• Tautan unduhan CV menggunakan <strong>Signed URL 60 detik</strong>.</li>
                <li>• Bucket dokumen performa kerja terisolasi khusus HR perusahaan.</li>
                <li>• Penghapusan lowongan &amp; perusahaan dilindungi terhadap kehilangan riwayat.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#e8d5d0] bg-white p-6 space-y-3 shadow-xs md:col-span-2">
              <div className="flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-[#b87a65]" />
                <h2 className="font-bold text-sm text-[#4a3728]">
                  Matriks Izin Peran HR (Role-Based Access Control)
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3.5 space-y-1">
                  <p className="font-bold text-[#4a3728]">Company Owner</p>
                  <p className="text-2xs text-[#7a6559]">
                    Akses penuh ke pengaturan perusahaan, manajemen tim HR, undangan, lowongan, dan evaluasi pelamar.
                  </p>
                </div>
                <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3.5 space-y-1">
                  <p className="font-bold text-[#4a3728]">HR Admin</p>
                  <p className="text-2xs text-[#7a6559]">
                    Membuat &amp; mengelola lowongan, mengatur kriteria evaluasi, melihat hasil AI screening, dan mengelola pelamar.
                  </p>
                </div>
                <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3.5 space-y-1">
                  <p className="font-bold text-[#4a3728]">HR Recruiter</p>
                  <p className="text-2xs text-[#7a6559]">
                    Meninjau pelamar, mengunduh snapshot CV, melihat rekomendasi talenta, dan memperbarui tahapan seleksi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
