import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getProjectApplicantsRecalculated } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, AlertCircle, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicantsManager } from "@/components/vendor/applicants-manager";
import type { Metadata } from "next";

interface ApplicantsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ApplicantsPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getProjectApplicantsRecalculated(id);
  return {
    title: data?.project?.title ? `Pelamar: ${data.project.title}` : "Daftar Pelamar Proyek",
    description: "Evaluasi pelamar terurut Match Score AI dan berikan status penerimaan.",
  };
}

export default async function ApplicantsPage({ params }: ApplicantsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await getProjectApplicantsRecalculated(id);

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Gagal Memuat Pelamar</h2>
            <p className="text-sm text-slate-600">{error || "Proyek tidak ditemukan."}</p>
            <div className="pt-2">
              <Link href="/vendor/dashboard">
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { project, applicants } = data;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/vendor/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Dashboard Vendor
              </Link>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Daftar Pelamar Proyek
                </h1>
                <Badge variant="secondary" className="text-xs font-bold">
                  {applicants.length} Pelamar
                </Badge>
                <Badge
                  variant={
                    project.status === "open"
                      ? "success"
                      : project.status === "in_progress"
                      ? "default"
                      : "outline"
                  }
                  className="text-xs uppercase"
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-purple-700 mt-1">
                &ldquo;{project.title}&rdquo;
              </p>
            </div>

            <Link href={`/vendor/projects/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Proyek</span>
              </Button>
            </Link>
          </div>

          {/* Interactive Applicants Manager */}
          <ApplicantsManager
            projectId={project.id}
            projectTitle={project.title}
            projectStatus={project.status}
            initialApplicants={applicants}
          />
        </div>
      </main>
    </div>
  );
}
