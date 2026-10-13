import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { getUnreviewedApplicationIds } from "./review-gate";

type VendorSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface PendingVendorReview {
  applicationId: string;
  projectId: string;
  projectTitle: string;
  talentName: string;
}

export async function getPendingVendorReviews(
  supabase: VendorSupabaseClient,
  vendorId: string
): Promise<{ data: PendingVendorReview[]; error: string | null }> {
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("vendor_id", vendorId);

  if (projectsError) {
    return { data: [], error: "Gagal memeriksa rating proyek yang tertunda." };
  }
  if (!projects?.length) return { data: [], error: null };

  const projectTitles = new Map(projects.map((project) => [project.id, project.title]));
  const { data: completedApplications, error: applicationsError } = await supabase
    .from("applications")
    .select("id, project_id, talent_id")
    .in("project_id", projects.map((project) => project.id))
    .eq("status", "completed");

  if (applicationsError) {
    return { data: [], error: "Gagal memeriksa lamaran yang menunggu rating." };
  }
  if (!completedApplications?.length) return { data: [], error: null };

  const applicationIds = completedApplications.map((application) => application.id);
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("application_id")
    .in("application_id", applicationIds);

  if (reviewsError) {
    return { data: [], error: "Gagal memeriksa rating yang sudah diberikan." };
  }

  const pendingIds = new Set(
    getUnreviewedApplicationIds(
      applicationIds,
      (reviews || []).map((review) => review.application_id)
    )
  );
  const pendingApplications = completedApplications.filter((application) => pendingIds.has(application.id));
  const talentIds = Array.from(new Set(pendingApplications.map((application) => application.talent_id)));
  const { data: profiles, error: profilesError } = talentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", talentIds)
    : { data: [], error: null };

  if (profilesError) {
    return { data: [], error: "Gagal memuat nama talent dengan rating tertunda." };
  }

  const talentNames = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));
  return {
    data: pendingApplications.map((application) => ({
      applicationId: application.id,
      projectId: application.project_id,
      projectTitle: projectTitles.get(application.project_id) || "Project",
      talentName: talentNames.get(application.talent_id) || "Talent",
    })),
    error: null,
  };
}
