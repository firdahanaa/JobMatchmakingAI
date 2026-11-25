import type {
  CompanyMemberStatus,
  CompanyRole,
  CompanyStatus,
  PlatformRole,
  UserRole,
} from "@/types/database";

export interface CompanyMembershipContext {
  companyId: string;
  companyName?: string;
  companyStatus: CompanyStatus;
  legacyVendorUserId?: string;
  role: CompanyRole;
  status: CompanyMemberStatus;
}

export interface ActorAuthorizationContext {
  userId: string;
  baseRole: UserRole;
  platformRole: PlatformRole;
  memberships: CompanyMembershipContext[];
}

export type PermissionAction =
  | "talent:manage_own_profile"
  | "talent:submit_application"
  | "company:view_dashboard"
  | "company:manage_settings"
  | "company:manage_team"
  | "company:view_team"
  | "company:deactivate"
  | "vacancy:create"
  | "vacancy:edit"
  | "vacancy:close"
  | "vacancy:delete"
  | "vacancy:view_all"
  | "evaluation:configure"
  | "applicant:view"
  | "applicant:update_status"
  | "applicant:download_cv"
  | "performance_doc:upload"
  | "performance_doc:view"
  | "platform:manage";

const COMPANY_ROLE_PERMISSIONS: Record<CompanyRole, ReadonlySet<PermissionAction>> = {
  company_owner: new Set<PermissionAction>([
    "company:view_dashboard",
    "company:manage_settings",
    "company:manage_team",
    "company:view_team",
    "company:deactivate",
    "vacancy:create",
    "vacancy:edit",
    "vacancy:close",
    "vacancy:delete",
    "vacancy:view_all",
    "evaluation:configure",
    "applicant:view",
    "applicant:update_status",
    "applicant:download_cv",
    "performance_doc:upload",
    "performance_doc:view",
  ]),
  hr_admin: new Set<PermissionAction>([
    "company:view_dashboard",
    "company:view_team",
    "vacancy:create",
    "vacancy:edit",
    "vacancy:close",
    "vacancy:delete",
    "vacancy:view_all",
    "evaluation:configure",
    "applicant:view",
    "applicant:update_status",
    "applicant:download_cv",
    "performance_doc:upload",
    "performance_doc:view",
  ]),
  hr_recruiter: new Set<PermissionAction>([
    "company:view_dashboard",
    "company:view_team",
    "vacancy:view_all",
    "applicant:view",
    "applicant:update_status",
    "applicant:download_cv",
    "performance_doc:upload",
    "performance_doc:view",
  ]),
};

/**
 * Finds the active membership of an actor for a specific company where the company is also active.
 */
export function getActiveCompanyMembership(
  actor: ActorAuthorizationContext,
  companyId: string,
): CompanyMembershipContext | null {
  return (
    actor.memberships.find(
      (membership) =>
        membership.companyId === companyId &&
        membership.status === "active" &&
        membership.companyStatus === "active",
    ) ?? null
  );
}

/**
 * Checks whether the actor has ANY membership record (active or disabled) in the company.
 * Used to enforce conflict-of-interest rules (e.g., preventing HR members from applying to their own company).
 */
export function hasAnyCompanyAssociation(
  actor: ActorAuthorizationContext,
  companyId: string,
): boolean {
  return actor.memberships.some((membership) => membership.companyId === companyId);
}

/**
 * Evaluates permissions according to the authoritative 5-role matrix.
 * Never trusts user_metadata.role.
 */
export function canPerformAction(
  actor: ActorAuthorizationContext,
  action: PermissionAction,
  targetCompanyId?: string,
): boolean {
  if (action === "platform:manage") {
    return actor.platformRole === "platform_admin";
  }

  if (action === "talent:manage_own_profile") {
    return actor.baseRole === "talent";
  }

  if (action === "talent:submit_application") {
    if (actor.baseRole !== "talent") {
      return false;
    }
    if (targetCompanyId && hasAnyCompanyAssociation(actor, targetCompanyId)) {
      return false;
    }
    return true;
  }

  // Platform Admin can deactivate companies or read audit metadata,
  // but CANNOT download raw CVs, upload/view performance docs, or mutate applications/vacancies
  if (actor.platformRole === "platform_admin") {
    if (
      action === "company:deactivate" ||
      action === "company:view_dashboard" ||
      action === "company:view_team" ||
      action === "vacancy:view_all" ||
      action === "applicant:view"
    ) {
      return true;
    }
  }

  if (!targetCompanyId) {
    return false;
  }

  const membership = getActiveCompanyMembership(actor, targetCompanyId);
  if (!membership) {
    return false;
  }

  return COMPANY_ROLE_PERMISSIONS[membership.role].has(action);
}

/**
 * Validates that a company retains at least one active company_owner after a proposed membership change.
 */
export function validateLastOwnerInvariant(input: {
  companyStatus: CompanyStatus;
  existingMembers: readonly {
    userId: string;
    role: CompanyRole;
    status: CompanyMemberStatus;
  }[];
  targetUserId: string;
  nextRole?: CompanyRole;
  nextStatus?: CompanyMemberStatus;
  isDelete?: boolean;
}): { valid: boolean; error: string | null } {
  if (input.companyStatus !== "active") {
    return { valid: true, error: null };
  }

  const remainingActiveOwners = input.existingMembers.filter((member) => {
    if (member.userId === input.targetUserId) {
      if (input.isDelete) return false;
      const roleAfter = input.nextRole ?? member.role;
      const statusAfter = input.nextStatus ?? member.status;
      return roleAfter === "company_owner" && statusAfter === "active";
    }
    return member.role === "company_owner" && member.status === "active";
  });

  if (remainingActiveOwners.length < 1) {
    return {
      valid: false,
      error: "Setiap perusahaan aktif wajib memiliki minimal satu Company Owner yang aktif.",
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates strict 1:1 consistency between project.company_id and project.vendor_id.
 */
export function validateProjectCompanyOwnership(input: {
  projectVendorId: string | null;
  projectCompanyId: string | null;
  companies: readonly { id: string; legacyVendorUserId: string }[];
}): {
  valid: boolean;
  resolvedCompanyId: string | null;
  resolvedVendorId: string | null;
  error: string | null;
} {
  const { projectVendorId, projectCompanyId, companies } = input;

  if (!projectVendorId && !projectCompanyId) {
    return {
      valid: false,
      resolvedCompanyId: null,
      resolvedVendorId: null,
      error: "Project must specify a valid company_id or vendor_id.",
    };
  }

  const companyFromVendor = projectVendorId
    ? companies.find((c) => c.legacyVendorUserId === projectVendorId) ?? null
    : null;
  const companyFromId = projectCompanyId
    ? companies.find((c) => c.id === projectCompanyId) ?? null
    : null;

  if (projectCompanyId && !companyFromId) {
    return {
      valid: false,
      resolvedCompanyId: null,
      resolvedVendorId: null,
      error: `Company workspace ${projectCompanyId} does not exist.`,
    };
  }

  if (!projectCompanyId && projectVendorId) {
    if (!companyFromVendor) {
      return {
        valid: false,
        resolvedCompanyId: null,
        resolvedVendorId: null,
        error: `Cannot resolve company workspace for vendor_id ${projectVendorId}.`,
      };
    }
    return {
      valid: true,
      resolvedCompanyId: companyFromVendor.id,
      resolvedVendorId: projectVendorId,
      error: null,
    };
  }

  if (projectCompanyId && !projectVendorId && companyFromId) {
    return {
      valid: true,
      resolvedCompanyId: companyFromId.id,
      resolvedVendorId: companyFromId.legacyVendorUserId,
      error: null,
    };
  }

  if (
    !companyFromVendor ||
    !companyFromId ||
    companyFromVendor.id !== companyFromId.id ||
    companyFromId.legacyVendorUserId !== projectVendorId
  ) {
    return {
      valid: false,
      resolvedCompanyId: null,
      resolvedVendorId: null,
      error: `Inconsistent project ownership: vendor_id ${projectVendorId} and company_id ${projectCompanyId} do not match.`,
    };
  }

  return {
    valid: true,
    resolvedCompanyId: companyFromId.id,
    resolvedVendorId: companyFromId.legacyVendorUserId,
    error: null,
  };
}
