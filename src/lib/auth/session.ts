"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ActorAuthorizationContext,
  CompanyMembershipContext,
} from "./rbac";
import type {
  CompanyMemberStatus,
  CompanyRole,
  CompanyStatus,
  PlatformRole,
  UserRole,
} from "@/types/database";

/**
 * Loads the authoritative actor context from the database (profiles + company_members + companies).
 * Gracefully falls back to vendor_profiles if the Phase 1 SQL migration has not yet been applied
 * on the developer's remote Supabase project.
 */
export async function getAuthenticatedActorContext(): Promise<{
  actor: ActorAuthorizationContext | null;
  email: string | null;
  fullName: string | null;
  activeCompany: CompanyMembershipContext | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      actor: null,
      email: null,
      fullName: null,
      activeCompany: null,
      error: "Sesi telah berakhir. Silakan login kembali.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile for actor context:", profileError);
  }

  const baseRole = ((profile?.role as UserRole | undefined) ||
    (user.user_metadata?.role as UserRole | undefined) ||
    "talent") as UserRole;
  const platformRole = ((profile as { platform_role?: PlatformRole } | null)?.platform_role ||
    "user") as PlatformRole;
  const fullName = profile?.full_name || user.user_metadata?.full_name || null;

  const memberships: CompanyMembershipContext[] = [];

  // Attempt to load Phase 1 company_members + companies
  const { data: memberRows, error: membersError } = await supabase
    .from("company_members")
    .select(`
      company_id,
      role,
      status,
      companies:company_id (
        id,
        name,
        status,
        legacy_vendor_user_id
      )
    `)
    .eq("user_id", user.id);

  if (!membersError && Array.isArray(memberRows) && memberRows.length > 0) {
    type RawMemberRow = {
      company_id: string;
      role: CompanyRole;
      status: CompanyMemberStatus;
      companies?:
        | {
            id: string;
            name: string;
            status: CompanyStatus;
            legacy_vendor_user_id: string;
          }
        | {
            id: string;
            name: string;
            status: CompanyStatus;
            legacy_vendor_user_id: string;
          }[]
        | null;
    };

    for (const row of memberRows as unknown as RawMemberRow[]) {
      const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
      memberships.push({
        companyId: row.company_id,
        companyName: comp?.name || "Perusahaan",
        companyStatus: comp?.status || "active",
        legacyVendorUserId: comp?.legacy_vendor_user_id || user.id,
        role: row.role,
        status: row.status,
      });
    }
  } else if (baseRole === "vendor") {
    // Backward-compatible fallback if Phase 1 migration hasn't run yet on remote DB
    const { data: vendorProf } = await supabase
      .from("vendor_profiles")
      .select("user_id, organization_name")
      .eq("user_id", user.id)
      .maybeSingle();

    memberships.push({
      companyId: vendorProf?.user_id || user.id,
      companyName: vendorProf?.organization_name || fullName || "Organisasi Vendor",
      companyStatus: "active",
      legacyVendorUserId: user.id,
      role: "company_owner",
      status: "active",
    });
  }

  const activeCompany =
    memberships.find((m) => m.status === "active" && m.companyStatus === "active") ?? null;

  return {
    actor: {
      userId: user.id,
      baseRole,
      platformRole,
      memberships,
    },
    email: user.email || null,
    fullName,
    activeCompany,
    error: null,
  };
}
