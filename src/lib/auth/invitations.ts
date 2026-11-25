import { createHash, randomBytes } from "crypto";
import type { CompanyInvitationStatus, CompanyRole, CompanyStatus } from "@/types/database";

export type InvitableCompanyRole = Extract<CompanyRole, "hr_admin" | "hr_recruiter">;

export interface InvitationRecord {
  id: string;
  companyId: string;
  email: string;
  role: InvitableCompanyRole;
  tokenHash: string;
  status: CompanyInvitationStatus;
  invitedBy: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  expiresAt: string;
}

export type InvitationAcceptanceErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_TOKEN"
  | "USER_NOT_FOUND"
  | "EMAIL_NOT_CONFIRMED"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_NOT_PENDING"
  | "INVITATION_EXPIRED"
  | "EMAIL_MISMATCH"
  | "COMPANY_INACTIVE";

export interface InvitationAcceptanceResult {
  success: boolean;
  companyId: string | null;
  errorCode: InvitationAcceptanceErrorCode | null;
  error: string | null;
  shouldPersistExpiredStatus?: boolean;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateInvitationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim(), "utf8").digest("hex");
}

/**
 * Pure deterministic evaluator mirroring public.accept_company_invitation() in PostgreSQL.
 * Guarantees that expired invitations return a normal result with shouldPersistExpiredStatus = true
 * rather than throwing an exception that rolls back the status = 'expired' update.
 */
export function evaluateInvitationAcceptance(input: {
  actorUserId: string | null;
  actorEmail: string | null;
  actorEmailConfirmedAt: string | null;
  rawToken: string | null;
  invitation: InvitationRecord | null;
  companyStatus: CompanyStatus | null;
  now?: Date;
}): InvitationAcceptanceResult {
  const now = input.now ?? new Date();

  if (!input.actorUserId) {
    return {
      success: false,
      companyId: null,
      errorCode: "UNAUTHENTICATED",
      error: "Authentication required.",
    };
  }

  const trimmedToken = input.rawToken?.trim() ?? "";
  if (trimmedToken.length < 32) {
    return {
      success: false,
      companyId: null,
      errorCode: "INVALID_TOKEN",
      error: "Token undangan tidak valid.",
    };
  }

  if (!input.actorEmail) {
    return {
      success: false,
      companyId: null,
      errorCode: "USER_NOT_FOUND",
      error: "Akun pengguna tidak ditemukan.",
    };
  }

  if (!input.actorEmailConfirmedAt) {
    return {
      success: false,
      companyId: null,
      errorCode: "EMAIL_NOT_CONFIRMED",
      error: "Email akun harus dikonfirmasi terlebih dahulu sebelum menerima undangan perusahaan.",
    };
  }

  const computedHash = hashInvitationToken(trimmedToken);
  if (!input.invitation || input.invitation.tokenHash !== computedHash) {
    return {
      success: false,
      companyId: null,
      errorCode: "INVITATION_NOT_FOUND",
      error: "Undangan tidak ditemukan atau token tidak valid.",
    };
  }

  if (input.invitation.status !== "pending") {
    return {
      success: false,
      companyId: null,
      errorCode: "INVITATION_NOT_PENDING",
      error: `Undangan ini sudah digunakan atau tidak lagi berlaku (status: ${input.invitation.status}).`,
    };
  }

  if (new Date(input.invitation.expiresAt).getTime() <= now.getTime()) {
    return {
      success: false,
      companyId: null,
      errorCode: "INVITATION_EXPIRED",
      error: "Undangan telah kedaluwarsa.",
      shouldPersistExpiredStatus: true,
    };
  }

  if (normalizeEmail(input.actorEmail) !== normalizeEmail(input.invitation.email)) {
    return {
      success: false,
      companyId: null,
      errorCode: "EMAIL_MISMATCH",
      error: "Alamat email akun yang login tidak sesuai dengan email tujuan undangan.",
    };
  }

  if (input.companyStatus !== "active") {
    return {
      success: false,
      companyId: null,
      errorCode: "COMPANY_INACTIVE",
      error: "Workspace perusahaan tidak aktif.",
    };
  }

  return {
    success: true,
    companyId: input.invitation.companyId,
    errorCode: null,
    error: null,
    shouldPersistExpiredStatus: false,
  };
}

/**
 * Pure helper mirroring public.expire_stale_company_invitations(p_company_id).
 * Marks only pending invitations for the company whose expiresAt <= now as 'expired'.
 */
export function expireStaleInvitationsInMemory(
  invitations: readonly InvitationRecord[],
  companyId: string,
  now: Date = new Date(),
): { updated: InvitationRecord[]; expiredCount: number } {
  let expiredCount = 0;
  const updated = invitations.map((inv) => {
    if (
      inv.companyId === companyId &&
      inv.status === "pending" &&
      new Date(inv.expiresAt).getTime() <= now.getTime()
    ) {
      expiredCount += 1;
      return { ...inv, status: "expired" as const };
    }
    return inv;
  });
  return { updated, expiredCount };
}

/**
 * Checks whether a new pending invitation can be created for (companyId, email),
 * enforcing the partial unique index on (company_id, lower(btrim(email))) WHERE status = 'pending'.
 */
export function canCreatePendingInvitation(
  invitations: readonly InvitationRecord[],
  companyId: string,
  email: string,
): boolean {
  const normalized = normalizeEmail(email);
  return !invitations.some(
    (inv) =>
      inv.companyId === companyId &&
      inv.status === "pending" &&
      normalizeEmail(inv.email) === normalized,
  );
}
