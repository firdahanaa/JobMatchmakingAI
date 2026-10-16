import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { HelpdeskForm } from "@/components/helpdesk/helpdesk-form";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = {
  title: "Bantuan",
  description: "Laporkan kendala pada akun, lamaran, project, atau pembayaran.",
};

interface HelpPageProps {
  searchParams: Promise<{ applicationId?: string; projectId?: string }>;
}

interface ProjectOption {
  id: string;
  title: string;
}

interface ApplicationOption {
  id: string;
  projectId: string;
  projectTitle: string;
}

type ApplicationWithProject = {
  id: string;
  project_id: string;
  projects:
    | { title: string }
    | { title: string }[]
    | null;
};

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=%2Fhelp");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const userRole = (profile?.role || user.user_metadata?.role || "talent") as UserRole;

  let projects: ProjectOption[] = [];
  let applications: ApplicationOption[] = [];

  if (userRole === "talent") {
    const { data } = await supabase
      .from("applications")
      .select("id, project_id, projects(title)")
      .eq("talent_id", user.id)
      .order("created_at", { ascending: false });
    const rows = (data || []) as unknown as ApplicationWithProject[];
    applications = rows.map((row) => {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      return {
        id: row.id,
        projectId: row.project_id,
        projectTitle: project?.title || "Project",
      };
    });
    const projectTitles = new Map<string, string>();
    for (const application of applications) {
      projectTitles.set(application.projectId, application.projectTitle);
    }
    projects = Array.from(projectTitles, ([id, title]) => ({ id, title }));

    if (query.projectId && !projects.some((project) => project.id === query.projectId)) {
      const { data: targetProject } = await supabase
        .from("projects")
        .select("id, title")
        .eq("id", query.projectId)
        .maybeSingle();
      if (targetProject) {
        projects.unshift({ id: targetProject.id, title: targetProject.title });
      }
    }

    if (query.applicationId && !applications.some((app) => app.id === query.applicationId)) {
      const { data: targetApp } = await supabase
        .from("applications")
        .select("id, project_id, projects(title)")
        .eq("id", query.applicationId)
        .maybeSingle();
      if (targetApp) {
        const targetProj = Array.isArray(targetApp.projects) ? targetApp.projects[0] : targetApp.projects;
        const projectTitle = targetProj?.title || "Project";
        applications.unshift({
          id: targetApp.id,
          projectId: targetApp.project_id,
          projectTitle,
        });
        if (!projects.some((project) => project.id === targetApp.project_id)) {
          projects.unshift({ id: targetApp.project_id, title: projectTitle });
        }
      }
    }
  } else if (userRole === "vendor") {
    const { data: projectRows } = await supabase
      .from("projects")
      .select("id, title")
      .eq("vendor_id", user.id)
      .order("created_at", { ascending: false });
    projects = (projectRows || []) as ProjectOption[];

    if (projects.length > 0) {
      const { data: applicationRows } = await supabase
        .from("applications")
        .select("id, project_id, projects(title)")
        .in("project_id", projects.map((project) => project.id))
        .order("created_at", { ascending: false });
      applications = ((applicationRows || []) as unknown as ApplicationWithProject[]).map((row) => {
        const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
        return {
          id: row.id,
          projectId: row.project_id,
          projectTitle: project?.title || "Project",
        };
      });
    }

    if (query.projectId && !projects.some((project) => project.id === query.projectId)) {
      const { data: targetProject } = await supabase
        .from("projects")
        .select("id, title")
        .eq("id", query.projectId)
        .maybeSingle();
      if (targetProject) {
        projects.unshift({ id: targetProject.id, title: targetProject.title });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A]">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Pusat bantuan</p>
          <h1 className="text-3xl font-black">Laporkan Kendala</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            Isi detail kendala. Pesan akan disiapkan untuk dikirim ke tim bantuan Pathfolio melalui aplikasi email pilihanmu.
          </p>
        </header>
        <HelpdeskForm
          userName={profile?.full_name || user.user_metadata?.full_name || "Pengguna"}
          userEmail={user.email || ""}
          userRole={userRole === "vendor" ? "vendor" : "talent"}
          projects={projects}
          applications={applications}
          initialProjectId={projects.some((project) => project.id === query.projectId) ? query.projectId : ""}
          initialApplicationId={applications.some((application) => application.id === query.applicationId) ? query.applicationId : ""}
        />
      </main>
    </div>
  );
}
