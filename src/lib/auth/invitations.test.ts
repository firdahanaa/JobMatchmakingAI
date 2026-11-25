import { describe, expect, it } from "vitest";
import {
  canCreatePendingInvitation,
  evaluateInvitationAcceptance,
  expireStaleInvitationsInMemory,
  generateInvitationToken,
  hashInvitationToken,
  type InvitationRecord,
} from "./invitations";

describe("Phase 1 Company Invitations Security & Lifecycle", () => {
  const companyId = "11111111-1111-4000-8000-000000000001";
  const now = new Date("2026-11-25T12:00:00Z");

  it("generates a 64-char hex raw token and a deterministic 64-char SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateInvitationToken();
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toBe(rawToken);
    expect(hashInvitationToken(rawToken)).toBe(tokenHash);
  });

  it("accepts a valid pending invitation when email is confirmed and matches", () => {
    const { rawToken, tokenHash } = generateInvitationToken();
    const invitation: InvitationRecord = {
      id: "inv-1",
      companyId,
      email: "HR.Admin@Company.id",
      role: "hr_admin",
      tokenHash,
      status: "pending",
      invitedBy: "owner-1",
      acceptedBy: null,
      acceptedAt: null,
      expiresAt: "2026-12-02T12:00:00Z",
    };

    const result = evaluateInvitationAcceptance({
      actorUserId: "user-hr-1",
      actorEmail: "hr.admin@company.id",
      actorEmailConfirmedAt: "2026-11-20T10:00:00Z",
      rawToken,
      invitation,
      companyStatus: "active",
      now,
    });

    expect(result.success).toBe(true);
    expect(result.companyId).toBe(companyId);
    expect(result.errorCode).toBeNull();
  });

  it("rejects invitation acceptance if email_confirmed_at is NULL", () => {
    const { rawToken, tokenHash } = generateInvitationToken();
    const invitation: InvitationRecord = {
      id: "inv-1",
      companyId,
      email: "hr@company.id",
      role: "hr_recruiter",
      tokenHash,
      status: "pending",
      invitedBy: "owner-1",
      acceptedBy: null,
      acceptedAt: null,
      expiresAt: "2026-12-02T12:00:00Z",
    };

    const result = evaluateInvitationAcceptance({
      actorUserId: "user-hr-1",
      actorEmail: "hr@company.id",
      actorEmailConfirmedAt: null,
      rawToken,
      invitation,
      companyStatus: "active",
      now,
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("EMAIL_NOT_CONFIRMED");
  });

  it("rejects invitation acceptance when logged-in email does not match invited email or token is invalid", () => {
    const { rawToken, tokenHash } = generateInvitationToken();
    const invitation: InvitationRecord = {
      id: "inv-1",
      companyId,
      email: "hr@company.id",
      role: "hr_recruiter",
      tokenHash,
      status: "pending",
      invitedBy: "owner-1",
      acceptedBy: null,
      acceptedAt: null,
      expiresAt: "2026-12-02T12:00:00Z",
    };

    const mismatchEmail = evaluateInvitationAcceptance({
      actorUserId: "user-other",
      actorEmail: "other@company.id",
      actorEmailConfirmedAt: "2026-11-20T10:00:00Z",
      rawToken,
      invitation,
      companyStatus: "active",
      now,
    });
    expect(mismatchEmail.success).toBe(false);
    expect(mismatchEmail.errorCode).toBe("EMAIL_MISMATCH");

    const wrongToken = evaluateInvitationAcceptance({
      actorUserId: "user-hr-1",
      actorEmail: "hr@company.id",
      actorEmailConfirmedAt: "2026-11-20T10:00:00Z",
      rawToken: "a".repeat(64),
      invitation,
      companyStatus: "active",
      now,
    });
    expect(wrongToken.success).toBe(false);
    expect(wrongToken.errorCode).toBe("INVITATION_NOT_FOUND");
  });

  it("flags expired invitations for persisted 'expired' status without throwing a rollback exception, and unblocks reinvitation after cleanup", () => {
    const { rawToken, tokenHash } = generateInvitationToken();
    const staleInvitation: InvitationRecord = {
      id: "inv-stale",
      companyId,
      email: "reinvite@company.id",
      role: "hr_admin",
      tokenHash,
      status: "pending",
      invitedBy: "owner-1",
      acceptedBy: null,
      acceptedAt: null,
      expiresAt: "2026-11-24T12:00:00Z", // in the past
    };

    // Before expiration cleanup, partial unique index blocks creating a second pending invite for the same email
    expect(canCreatePendingInvitation([staleInvitation], companyId, "reinvite@company.id")).toBe(
      false,
    );

    // Accepting an expired invitation returns shouldPersistExpiredStatus = true instead of throwing
    const acceptExpired = evaluateInvitationAcceptance({
      actorUserId: "user-hr-1",
      actorEmail: "reinvite@company.id",
      actorEmailConfirmedAt: "2026-11-20T10:00:00Z",
      rawToken,
      invitation: staleInvitation,
      companyStatus: "active",
      now,
    });
    expect(acceptExpired.success).toBe(false);
    expect(acceptExpired.errorCode).toBe("INVITATION_EXPIRED");
    expect(acceptExpired.shouldPersistExpiredStatus).toBe(true);

    // Running expire_stale_company_invitations transitions pending -> expired and unblocks reinvitation
    const { updated, expiredCount } = expireStaleInvitationsInMemory(
      [staleInvitation],
      companyId,
      now,
    );
    expect(expiredCount).toBe(1);
    expect(updated[0].status).toBe("expired");
    expect(canCreatePendingInvitation(updated, companyId, "reinvite@company.id")).toBe(true);
  });
});
