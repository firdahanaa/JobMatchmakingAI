import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { VendorPageNavigation } from "@/components/vendor/vendor-page-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { getAllCompanyApplicants } from "../company-actions";
import { createClient } from "@/lib/supabase/server";
import { Users, FileText, ArrowRight, AlertCircle, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Daftar Pelamar Perusahaan",
  description: "Pantau seluruh lamaran yang masuk di seluruh lowongan perusahaan Anda.",
};

export default async function VendorAllApplicantsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { applicants, error } = await getAllCompanyApplicants();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-4">
            <VendorPageNavigation activePage="applicants" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4a3728]">
                  Seluruh Pelamar &amp; Lamaran Masuk
                </h1>
                <p className="text-xs sm:text-sm text-[#7a6559] mt-0.5">
                  Tinjau status lamaran, snapshot CV, dan status AI Screening dari seluruh lowongan perusahaan Anda.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit text-xs font-bold">
                {applicants.length} Lamaran
              </Badge>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {applicants.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-[#e8d5d0] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e8d5d0] bg-[#fbf8f6] text-[#695449] uppercase text-2xs font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Kandidat</th>
                      <th className="py-3.5 px-4">Lowongan</th>
                      <th className="py-3.5 px-4">Snapshot CV</th>
                      <th className="py-3.5 px-4">AI Screening</th>
                      <th className="py-3.5 px-4">Skor</th>
                      <th className="py-3.5 px-4">Status Rekrutmen</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F7ECEA]">
                    {applicants.map((app) => (
                      <tr key={app.applicationId} className="hover:bg-[#fbf8f6] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#4a3728]">{app.talentName}</div>
                          {app.talentHeadline && (
                            <div className="text-2xs text-[#8a7668] truncate max-w-[200px]">
                              {app.talentHeadline}
                            </div>
                          )}
                          <div className="text-3xs text-[#a89080] flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(app.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#5c4639]">
                          {app.projectTitle}
                        </td>
                        <td className="py-3.5 px-4">
                          {app.candidateCvFilename ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-medium text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md max-w-[180px] truncate">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate">{app.candidateCvFilename}</span>
                            </span>
                          ) : (
                            <span className="text-2xs text-[#a89080] italic">Tanpa CV</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              app.screeningStatus === "completed"
                                ? "success"
                                : app.screeningStatus === "failed"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-3xs capitalize"
                          >
                            {app.screeningStatus === "completed"
                              ? "Selesai"
                              : app.screeningStatus === "processing"
                              ? "Diproses"
                              : app.screeningStatus === "queued"
                              ? "Antrean"
                              : app.screeningStatus === "needs_review"
                              ? "Perlu Review"
                              : "Gagal"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          {app.matchScore !== null ? (
                            <MatchScoreBadge score={Math.round(app.matchScore)} size="sm" />
                          ) : (
                            <span className="text-2xs text-[#a89080]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              app.status === "accepted"
                                ? "success"
                                : app.status === "rejected"
                                ? "destructive"
                                : app.status === "completed"
                                ? "default"
                                : "warning"
                            }
                            className="text-3xs capitalize"
                          >
                            {app.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/vendor/projects/${app.projectId}/applicants`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                              <span>Evaluasi</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d4b0a5] bg-white p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F7ECEA] text-[#C98B75]">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-[#4a3728] text-base">Belum Ada Lamaran Masuk</h3>
              <p className="text-xs text-[#8a7668] max-w-sm mx-auto">
                Pastikan perusahaan Anda memiliki lowongan berstatus &ldquo;Open&rdquo; agar kandidat dapat mengirimkan lamaran.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
