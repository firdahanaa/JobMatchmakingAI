import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProjectForm, type SelectedProjectSkillItem } from "@/components/vendor/project-form";
import { getProjectForEdit, updateProject } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import { Edit3, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await getProjectForEdit(id);

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Tidak Dapat Mengedit Proyek</h2>
            <p className="text-sm text-slate-600">
              {error || "Proyek tidak ditemukan atau Anda tidak memiliki hak akses."}
            </p>
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

  const { project, skills, masterSkills } = data;

  const formattedSkills: SelectedProjectSkillItem[] = skills.map((s) => ({
    skillId: s.skill_id,
    skillName: s.skill?.name || `Skill #${s.skill_id}`,
    category: s.skill?.category || "Lainnya",
    minLevel: s.min_level,
    isRequired: s.is_required,
  }));

  const initialData = {
    id: project.id,
    title: project.title,
    description: project.description,
    difficulty: project.difficulty,
    type: project.type,
    mode: project.mode,
    durationWeeks: project.duration_weeks,
    hoursPerWeek: project.hours_per_week,
    rewardAmount: project.reward_amount,
    rewardNote: project.reward_note,
    deadline: project.deadline,
    status: project.status,
    skills: formattedSkills,
  };

  const handleUpdate = async (inputData: Parameters<typeof updateProject>[1]) => {
    "use server";
    return await updateProject(id, inputData);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 text-purple-700 px-3 py-0.5 text-xs font-semibold">
              <Edit3 className="h-3.5 w-3.5" />
              Edit Proyek
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Perbarui Informasi Proyek
            </h1>
            <p className="text-sm text-slate-600">
              Ubah rincian tugas, spesifikasi keahlian, dan status proyek Anda.
            </p>
          </div>

          {/* Form */}
          <ProjectForm
            initialData={initialData}
            masterSkills={masterSkills}
            onSubmit={handleUpdate}
            isEdit={true}
          />
        </div>
      </main>
    </div>
  );
}
