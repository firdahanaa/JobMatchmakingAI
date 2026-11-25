import type { ApplicationStatus, CompanyRole } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STRICT_PERF_DOC_PATH_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

const ALLOWED_HR_COMPANY_ROLES = new Set<string>([
  "vendor",
  "company_owner",
  "hr_admin",
  "hr_recruiter",
]);

export function tryCastUuid(input: string | null | undefined): string | null {
  if (!input || !UUID_REGEX.test(input)) {
    return null;
  }
  return input.toLowerCase();
}

export function canVendorAccessApplicationCv(input: {
  userRole: string;
  vendorId?: string;
  projectVendorId?: string;
  userCompanyId?: string | null;
  projectCompanyId?: string | null;
  companyMemberStatus?: "active" | "disabled";
  companyStatus?: "active" | "deactivated" | "archived";
  isPlatformAdmin?: boolean;
  applicationCandidateId: string;
  cvCandidateId: string;
  applicationCvId: string | null;
  cvId: string;
}): boolean {
  // Platform Admin is denied raw CV file downloads by default
  if (input.isPlatformAdmin && !ALLOWED_HR_COMPANY_ROLES.has(input.userRole)) {
    return false;
  }

  if (!ALLOWED_HR_COMPANY_ROLES.has(input.userRole)) {
    return false;
  }

  if (input.companyMemberStatus && input.companyMemberStatus !== "active") {
    return false;
  }

  if (input.companyStatus && input.companyStatus !== "active") {
    return false;
  }

  const companyMatches =
    input.userCompanyId != null &&
    input.projectCompanyId != null &&
    input.userCompanyId === input.projectCompanyId;

  const legacyVendorMatches =
    input.vendorId != null &&
    input.projectVendorId != null &&
    input.vendorId === input.projectVendorId;

  if (!companyMatches && !legacyVendorMatches) {
    return false;
  }

  return (
    input.applicationCvId !== null &&
    input.applicationCvId === input.cvId &&
    input.applicationCandidateId === input.cvCandidateId
  );
}

/**
 * Validates strict <company_uuid>/<application_uuid>/<file_uuid>.pdf format
 * and verifies that the caller is an active HR member of company_uuid
 * AND that application_uuid belongs to a project owned by company_uuid.
 */
export function validatePerformanceDocumentStoragePath(objectName: string | null | undefined): {
  valid: boolean;
  companyId: string | null;
  applicationId: string | null;
  fileUuid: string | null;
} {
  if (!objectName || !STRICT_PERF_DOC_PATH_REGEX.test(objectName)) {
    return { valid: false, companyId: null, applicationId: null, fileUuid: null };
  }

  const segments = objectName.split("/");
  if (segments.length !== 3) {
    return { valid: false, companyId: null, applicationId: null, fileUuid: null };
  }

  const companyId = tryCastUuid(segments[0]);
  const applicationId = tryCastUuid(segments[1]);
  const fileUuid = tryCastUuid(segments[2].replace(/\.pdf$/i, ""));

  if (!companyId || !applicationId || !fileUuid) {
    return { valid: false, companyId: null, applicationId: null, fileUuid: null };
  }

  return { valid: true, companyId, applicationId, fileUuid };
}

export function canAccessPerformanceDocumentObject(input: {
  objectName: string | null | undefined;
  actorCompanyRole: CompanyRole | "talent" | "platform_admin" | null;
  actorMemberStatus?: "active" | "disabled";
  actorCompanyId: string | null;
  companyStatus?: "active" | "deactivated" | "archived";
  applicationIdInDb: string | null;
  applicationProjectCompanyId: string | null;
}): boolean {
  // Neither Talent nor Platform Admin may access raw performance documents
  if (
    !input.actorCompanyRole ||
    input.actorCompanyRole === "talent" ||
    input.actorCompanyRole === "platform_admin"
  ) {
    return false;
  }

  if ((input.actorMemberStatus ?? "active") !== "active") {
    return false;
  }

  if ((input.companyStatus ?? "active") !== "active") {
    return false;
  }

  const parsed = validatePerformanceDocumentStoragePath(input.objectName);
  if (!parsed.valid || !parsed.companyId || !parsed.applicationId) {
    return false;
  }

  const actorCompanyId = tryCastUuid(input.actorCompanyId);
  const appIdInDb = tryCastUuid(input.applicationIdInDb);
  const appProjectCompanyId = tryCastUuid(input.applicationProjectCompanyId);

  if (!actorCompanyId || !appIdInDb || !appProjectCompanyId) {
    return false;
  }

  return (
    parsed.companyId === actorCompanyId &&
    parsed.applicationId === appIdInDb &&
    appProjectCompanyId === parsed.companyId
  );
}

export interface ApplicationRowState {
  id: string;
  projectId: string;
  talentId: string;
  status: ApplicationStatus;
  message: string | null;
  matchScore: number | null;
  candidateCvId: string | null;
  createdAt: string;
}

/**
 * Mirrors the exact column-level & actor-based guards in public.prevent_application_cv_snapshot_rewrite().
 */
export function validateApplicationUpdate(input: {
  oldRow: ApplicationRowState;
  newRow: ApplicationRowState;
  actorUserId: string | null;
  actorIsServiceRole?: boolean;
  actorIsPlatformAdmin?: boolean;
  actorIsTalentBaseRole?: boolean;
  actorIsAuthorizedCompanyHr?: boolean;
  talentCurrentCvId: string | null;
  newCvCandidateId: string | null;
  oldCvStillExists?: boolean;
}): { allowed: boolean; error: string | null } {
  const { oldRow, newRow } = input;

  // 1. Identity fields are unconditionally immutable
  if (
    newRow.id !== oldRow.id ||
    newRow.projectId !== oldRow.projectId ||
    newRow.talentId !== oldRow.talentId
  ) {
    return {
      allowed: false,
      error: "Application identity fields (id, project_id, talent_id) are immutable.",
    };
  }

  // 2. Service role / FK cascade when CV row deleted
  if (!input.actorUserId && input.actorIsServiceRole) {
    if (newRow.candidateCvId !== oldRow.candidateCvId) {
      if (newRow.candidateCvId === null && input.oldCvStillExists === false) {
        return { allowed: true, error: null };
      }
      return { allowed: false, error: "Application CV snapshots are immutable." };
    }
    return { allowed: true, error: null };
  }

  if (!input.actorUserId) {
    return { allowed: false, error: "Authentication required to update applications." };
  }

  const isTalentOwner =
    Boolean(input.actorIsTalentBaseRole) && input.actorUserId === oldRow.talentId;
  const isAuthorizedHr =
    input.actorUserId !== oldRow.talentId && Boolean(input.actorIsAuthorizedCompanyHr);

  // 3. Platform Admin without HR membership on the company is strictly denied
  if (input.actorIsPlatformAdmin && !isTalentOwner && !isAuthorizedHr) {
    return {
      allowed: false,
      error: "Platform Admin is not permitted to modify application records.",
    };
  }

  // 4. Talent Owner branch
  if (isTalentOwner) {
    if (oldRow.status === "pending" && newRow.status === "withdrawn") {
      if (
        newRow.candidateCvId !== oldRow.candidateCvId ||
        newRow.matchScore !== oldRow.matchScore ||
        newRow.message !== oldRow.message ||
        newRow.createdAt !== oldRow.createdAt
      ) {
        return {
          allowed: false,
          error:
            "Talent cannot modify application score, message, or CV snapshot while withdrawing.",
        };
      }
      return { allowed: true, error: null };
    }

    if (oldRow.status === "withdrawn" && newRow.status === "pending") {
      const validNullCv = newRow.candidateCvId === null && input.talentCurrentCvId === null;
      const validMatchingCurrentCv =
        newRow.candidateCvId !== null &&
        newRow.candidateCvId === input.talentCurrentCvId &&
        input.newCvCandidateId === newRow.talentId;

      if (!validNullCv && !validMatchingCurrentCv) {
        return {
          allowed: false,
          error: "Application CV snapshot on re-apply must match the Talent current valid CV.",
        };
      }
      return { allowed: true, error: null };
    }

    return {
      allowed: false,
      error: `Invalid application status transition (${oldRow.status} -> ${newRow.status}) by Talent.`,
    };
  }

  // 5. Authorized HR branch
  if (isAuthorizedHr) {
    if (newRow.candidateCvId !== oldRow.candidateCvId) {
      return { allowed: false, error: "Application CV snapshots are immutable." };
    }

    if (
      newRow.message !== oldRow.message ||
      newRow.matchScore !== oldRow.matchScore ||
      newRow.createdAt !== oldRow.createdAt
    ) {
      return {
        allowed: false,
        error: "HR members are only permitted to update the application status column.",
      };
    }

    const validOldStatus = oldRow.status === "pending" || oldRow.status === "accepted";
    const validNewStatus =
      newRow.status === "accepted" ||
      newRow.status === "rejected" ||
      newRow.status === "completed";

    if (!validOldStatus || !validNewStatus) {
      return {
        allowed: false,
        error: `Invalid application status transition (${oldRow.status} -> ${newRow.status}) by HR.`,
      };
    }

    return { allowed: true, error: null };
  }

  return { allowed: false, error: "Unauthorized application update." };
}
