import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProjectForm } from "@/components/vendor/project-form";
import { getMasterSkills, createProject } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { PlusCircle } from "lucide-react";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: masterSkills } = await getMasterSkills();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 text-purple-700 px-3 py-0.5 text-xs font-semibold">
              <PlusCircle className="h-3.5 w-3.5" />
              Posting Proyek Baru
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Buat Kebutuhan Proyek
            </h1>
            <p className="text-sm text-slate-600">
              Lengkapi detail proyek dan spesifikasi keahlian yang dibutuhkan agar sistem AI dapat mencocokkan talenta muda terbaik untuk Anda.
            </p>
          </div>

          {/* Form */}
          <ProjectForm
            masterSkills={masterSkills}
            onSubmit={createProject}
            isEdit={false}
          />
        </div>
      </main>
    </div>
  );
}
