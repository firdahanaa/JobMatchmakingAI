"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedActorContext } from "@/lib/auth/session";
import { canPerformAction, validateLastOwnerInvariant } from "@/lib/auth/rbac";
import {
  generateInvitationToken,
  normalizeEmail,
  type InvitableCompanyRole,
} from "@/lib/auth/invitations";
import type {
  ApplicationStatus,
  Company,
  CompanyInvitation,
  CompanyMember,
  CompanyMemberStatus,
  CompanyRole,
  CvProcessingStatus,
  ScreeningStatus,
} from "@/types/database";

const inviteSchema = z.object({
  email: z.string().trim().email("Format email undangan tidak valid"),
  role: z.enum(["hr_admin", "hr_recruiter"], {
    message: "Peran undangan harus hr_admin atau hr_recruiter",
  }),
});

export interface CompanyWorkspaceOverview {
  company: Company;
  actorRole: CompanyRole;
  canManageTeam: boolean;
  canManageSettings: boolean;
  members: (CompanyMember & {
    fullName: string;
    email?: string;
  })[];
  invitations: CompanyInvitation[];
}

export interface CompanyApplicantRow {
  applicationId: string;
  projectId: string;
  projectTitle: string;
  talentId: string;
  talentName: string;
  talentHeadline: string | null;
  status: ApplicationStatus;
  screeningStatus: ScreeningStatus;
  matchScore: number | null;
  candidateCvFilename: string | null;
  createdAt: string;
}

export async function getCompanyWorkspaceOverview(): Promise<{
  data: CompanyWorkspaceOverview | null;
  error: string | null;
}> {
  try {
    const { actor, activeCompany, fullName, error } = await getAuthenticatedActorContext();
    if (error || !actor || !activeCompany) {
      return {
        data: null,
        error: error || "Akses ditolak. Akun Anda belum terhubung ke workspace perusahaan aktif.",
      };
    }

    const supabase = await createClient();

    // Try loading from Phase 1 companies table
    const { data: companyRow, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", activeCompany.companyId)
      .maybeSingle();

    let company: Company;
    if (!companyError && companyRow) {
      company = companyRow as Company;
    } else {
      // Fallback to vendor_profiles if Phase 1 migration hasn't been executed on remote DB yet
      const { data: vp } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", activeCompany.legacyVendorUserId || actor.userId)
        .maybeSingle();

      company = {
        id: activeCompany.companyId,
        legacy_vendor_user_id: activeCompany.legacyVendorUserId || actor.userId,
        name: vp?.organization_name || activeCompany.companyName || fullName || "Organisasi Vendor",
        description: vp?.description ?? null,
        website: vp?.website ?? null,
        location: vp?.location ?? null,
        status: "active",
        deactivated_at: null,
        created_by: actor.userId,
        created_at: vp?.updated_at || new Date().toISOString(),
        updated_at: vp?.updated_at || new Date().toISOString(),
      };
    }

    // Expire stale invitations if user is owner or hr_admin
    if (activeCompany.role === "company_owner" || activeCompany.role === "hr_admin") {
      await supabase.rpc("expire_stale_company_invitations", {
        p_company_id: company.id,
      });
    }

    const [membersRes, invitationsRes] = await Promise.all([
      supabase
        .from("company_members")
        .select("*, profiles:user_id(id, full_name, avatar_url, role)")
        .eq("company_id", company.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("company_invitations")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false }),
    ]);

    type RawMember = CompanyMember & {
      profiles?:
        | { id: string; full_name: string; avatar_url: string | null; role: string }
        | { id: string; full_name: string; avatar_url: string | null; role: string }[]
        | null;
    };

    const rawMembers = (membersRes.data || []) as unknown as RawMember[];
    const members: CompanyWorkspaceOverview["members"] =
      rawMembers.length > 0
        ? rawMembers.map((m) => {
            const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return {
              ...m,
              fullName: prof?.full_name || "Anggota Tim HR",
            };
          })
        : [
            {
              id: actor.userId,
              company_id: company.id,
              user_id: actor.userId,
              role: activeCompany.role,
              status: "active",
              invited_by: null,
              joined_at: company.created_at,
              created_at: company.created_at,
              updated_at: company.updated_at,
              fullName: fullName || company.name,
            },
          ];

    const invitations = ((invitationsRes.data || []) as unknown as CompanyInvitation[]) ?? [];

    return {
      data: {
        company,
        actorRole: activeCompany.role,
        canManageTeam: canPerformAction(actor, "company:manage_team", company.id),
        canManageSettings: canPerformAction(actor, "company:manage_settings", company.id),
        members,
        invitations,
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("getCompanyWorkspaceOverview error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Gagal memuat data workspace perusahaan.",
    };
  }
}

export async function createCompanyInvitation(input: {
  email: string;
  role: InvitableCompanyRole;
}): Promise<{
  success: boolean;
  rawToken?: string;
  error: string | null;
}> {
  try {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Data undangan tidak valid.",
      };
    }

    const { actor, activeCompany, error } = await getAuthenticatedActorContext();
    if (error || !actor || !activeCompany) {
      return { success: false, error: error || "Autentikasi gagal." };
    }

    if (!canPerformAction(actor, "company:manage_team", activeCompany.companyId)) {
      return {
        success: false,
        error: "Hanya Company Owner yang berwenang mengundang anggota tim HR baru.",
      };
    }

    const supabase = await createClient();

    // Clean up expired pending invitations first so expired emails can be re-invited
    await supabase.rpc("expire_stale_company_invitations", {
      p_company_id: activeCompany.companyId,
    });

    const { rawToken, tokenHash } = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("company_invitations").insert({
      company_id: activeCompany.companyId,
      email: normalizeEmail(parsed.data.email),
      role: parsed.data.role,
      token_hash: tokenHash,
      status: "pending",
      invited_by: actor.userId,
      expires_at: expiresAt,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          error: "Masih ada undangan aktif (pending) untuk alamat email tersebut.",
        };
      }
      return {
        success: false,
        error: insertError.message || "Gagal membuat undangan perusahaan.",
      };
    }

    revalidatePath("/vendor/invitations");
    revalidatePath("/vendor/team");
    return { success: true, rawToken, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membuat undangan.",
    };
  }
}

export async function revokeCompanyInvitation(invitationId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { actor, activeCompany, error } = await getAuthenticatedActorContext();
    if (error || !actor || !activeCompany) {
      return { success: false, error: error || "Autentikasi gagal." };
    }

    if (!canPerformAction(actor, "company:manage_team", activeCompany.companyId)) {
      return {
        success: false,
        error: "Hanya Company Owner yang dapat membatalkan undangan.",
      };
    }

    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("company_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId)
      .eq("company_id", activeCompany.companyId)
      .eq("status", "pending");

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/vendor/invitations");
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membatalkan undangan.",
    };
  }
}

export async function acceptCompanyInvitationAction(rawToken: string): Promise<{
  success: boolean;
  companyId: string | null;
  error: string | null;
}> {
  try {
    const trimmed = rawToken.trim();
    if (trimmed.length < 32) {
      return { success: false, companyId: null, error: "Token undangan tidak valid." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("accept_company_invitation", {
      p_raw_token: trimmed,
    });

    if (error) {
      return {
        success: false,
        companyId: null,
        error: error.message || "Gagal memproses token undangan.",
      };
    }

    const result = data as {
      success: boolean;
      company_id: string | null;
      error_code: string | null;
      error: string | null;
    } | null;

    if (!result || !result.success) {
      return {
        success: false,
        companyId: null,
        error: result?.error || "Token undangan tidak dapat diterima.",
      };
    }

    revalidatePath("/vendor/dashboard");
    revalidatePath("/vendor/team");
    revalidatePath("/vendor/invitations");
    return { success: true, companyId: result.company_id, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      companyId: null,
      error: err instanceof Error ? err.message : "Gagal menerima undangan.",
    };
  }
}

export async function updateCompanyMemberRoleOrStatus(input: {
  memberUserId: string;
  role?: CompanyRole;
  status?: CompanyMemberStatus;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: overview, error: overviewError } = await getCompanyWorkspaceOverview();
    if (overviewError || !overview) {
      return { success: false, error: overviewError || "Gagal memuat workspace." };
    }

    if (!overview.canManageTeam) {
      return {
        success: false,
        error: "Hanya Company Owner yang berwenang mengubah peran atau status anggota tim.",
      };
    }

    const invariantCheck = validateLastOwnerInvariant({
      companyStatus: overview.company.status,
      existingMembers: overview.members.map((m) => ({
        userId: m.user_id,
        role: m.role,
        status: m.status,
      })),
      targetUserId: input.memberUserId,
      nextRole: input.role,
      nextStatus: input.status,
    });

    if (!invariantCheck.valid) {
      return { success: false, error: invariantCheck.error };
    }

    const supabase = await createClient();
    const targetMember = overview.members.find((m) => m.user_id === input.memberUserId);

    // If restoring a disabled member to active, use explicit restore_company_member RPC
    if (targetMember?.status === "disabled" && input.status === "active") {
      const { error: restoreError } = await supabase.rpc("restore_company_member", {
        p_company_id: overview.company.id,
        p_member_user_id: input.memberUserId,
        p_restored_role: input.role ?? targetMember.role,
      });

      if (restoreError) {
        return { success: false, error: restoreError.message };
      }
    } else {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.role) updates.role = input.role;
      if (input.status) updates.status = input.status;

      const { error: updateError } = await supabase
        .from("company_members")
        .update(updates)
        .eq("company_id", overview.company.id)
        .eq("user_id", input.memberUserId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }

    revalidatePath("/vendor/team");
    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui anggota tim.",
    };
  }
}

export async function getAllCompanyApplicants(): Promise<{
  applicants: CompanyApplicantRow[];
  error: string | null;
}> {
  try {
    const { actor, activeCompany, error } = await getAuthenticatedActorContext();
    if (error || !actor || !activeCompany) {
      return { applicants: [], error: error || "Autentikasi gagal." };
    }

    const supabase = await createClient();

    // Fetch projects owned by the company (or legacy vendor_id)
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, title, vendor_id")
      .order("created_at", { ascending: false });

    const projects = projectsData || [];
    if (projects.length === 0) {
      return { applicants: [], error: null };
    }

    const projectMap = new Map(projects.map((p) => [p.id, p.title]));
    const projectIds = projects.map((p) => p.id);

    const { data: appsData, error: appsError } = await supabase
      .from("applications")
      .select("id, project_id, talent_id, status, match_score, candidate_cv_id, created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (appsError || !appsData || appsData.length === 0) {
      return { applicants: [], error: appsError ? appsError.message : null };
    }

    const talentIds = Array.from(new Set(appsData.map((a) => a.talent_id)));
    const cvIds = Array.from(
      new Set(appsData.map((a) => a.candidate_cv_id).filter((id): id is string => Boolean(id))),
    );

    const [profilesRes, talentProfilesRes, cvsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", talentIds),
      supabase.from("talent_profiles").select("user_id, headline").in("user_id", talentIds),
      cvIds.length > 0
        ? supabase
            .from("candidate_cvs")
            .select("id, original_filename, processing_status")
            .in("id", cvIds)
        : Promise.resolve({ data: [] }),
    ]);

    const nameMap = new Map((profilesRes.data || []).map((p) => [p.id, p.full_name]));
    const headlineMap = new Map(
      (talentProfilesRes.data || []).map((tp) => [tp.user_id, tp.headline]),
    );
    const cvMap = new Map(
      (cvsRes.data || []).map((cv) => [
        cv.id,
        {
          filename: cv.original_filename,
          status: cv.processing_status as CvProcessingStatus,
        },
      ]),
    );

    const rows: CompanyApplicantRow[] = appsData.map((app) => {
      const cvInfo = app.candidate_cv_id ? cvMap.get(app.candidate_cv_id) : undefined;
      let screeningStatus: ScreeningStatus = "completed";
      if (cvInfo) {
        if (cvInfo.status === "pending") screeningStatus = "queued";
        else if (cvInfo.status === "processing") screeningStatus = "processing";
        else if (cvInfo.status === "failed") screeningStatus = "failed";
        else if (cvInfo.status === "needs_ocr") screeningStatus = "needs_review";
      }

      return {
        applicationId: app.id,
        projectId: app.project_id,
        projectTitle: projectMap.get(app.project_id) || "Lowongan",
        talentId: app.talent_id,
        talentName: nameMap.get(app.talent_id) || "Kandidat Talenta",
        talentHeadline: headlineMap.get(app.talent_id) ?? null,
        status: app.status as ApplicationStatus,
        screeningStatus,
        matchScore: app.match_score != null ? Number(app.match_score) : null,
        candidateCvFilename: cvInfo?.filename ?? null,
        createdAt: app.created_at,
      };
    });

    return { applicants: rows, error: null };
  } catch (err: unknown) {
    return {
      applicants: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar pelamar perusahaan.",
    };
  }
}
