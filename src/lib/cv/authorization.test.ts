import { describe, expect, it } from "vitest";
import {
  canAccessPerformanceDocumentObject,
  canVendorAccessApplicationCv,
  tryCastUuid,
  validateApplicationUpdate,
  validatePerformanceDocumentStoragePath,
  type ApplicationRowState,
} from "./authorization";

const compA = "11111111-1111-4000-8000-000000000001";
const compB = "22222222-2222-4000-8000-000000000002";
const appA = "33333333-3333-4000-8000-000000000003";
const fileUuid = "44444444-4444-4000-8000-000000000004";

const authorizedApplication = {
  userRole: "vendor",
  vendorId: "vendor-a",
  projectVendorId: "vendor-a",
  userCompanyId: compA,
  projectCompanyId: compA,
  applicationCandidateId: "talent-a",
  cvCandidateId: "talent-a",
  applicationCvId: "cv-a",
  cvId: "cv-a",
};

describe("Applicant CV authorization", () => {
  it("allows the vendor or active company HR members (owner, hr_admin, hr_recruiter) who own the applicant's project to access its CV snapshot", () => {
    expect(canVendorAccessApplicationCv(authorizedApplication)).toBe(true);
    expect(
      canVendorAccessApplicationCv({
        ...authorizedApplication,
        userRole: "hr_admin",
        vendorId: "hr-admin-user",
      }),
    ).toBe(true);
    expect(
      canVendorAccessApplicationCv({
        ...authorizedApplication,
        userRole: "hr_recruiter",
        vendorId: "hr-recruiter-user",
      }),
    ).toBe(true);
  });

  it("denies other companies, disabled HR members, platform admins, talents, and mismatched CV or candidate records", () => {
    expect(
      canVendorAccessApplicationCv({
        ...authorizedApplication,
        vendorId: "vendor-b",
        userCompanyId: compB,
      }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({
        ...authorizedApplication,
        userRole: "hr_recruiter",
        companyMemberStatus: "disabled",
      }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({
        ...authorizedApplication,
        userRole: "platform_admin",
        isPlatformAdmin: true,
      }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({ ...authorizedApplication, userRole: "talent" }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({ ...authorizedApplication, cvCandidateId: "talent-b" }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({ ...authorizedApplication, applicationCvId: "cv-b" }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({ ...authorizedApplication, applicationCvId: null }),
    ).toBe(false);
  });
});

describe("Strict Performance Document Storage Path & Cross-Company Validation", () => {
  it("safely parses valid UUIDs and returns null for malformed UUID strings", () => {
    expect(tryCastUuid(compA)).toBe(compA);
    expect(tryCastUuid("not-a-uuid")).toBeNull();
    expect(tryCastUuid("")).toBeNull();
    expect(tryCastUuid(null)).toBeNull();
  });

  it("enforces exact <company_uuid>/<application_uuid>/<file_uuid>.pdf format", () => {
    const validPath = `${compA}/${appA}/${fileUuid}.pdf`;
    const parsed = validatePerformanceDocumentStoragePath(validPath);
    expect(parsed.valid).toBe(true);
    expect(parsed.companyId).toBe(compA);
    expect(parsed.applicationId).toBe(appA);
    expect(parsed.fileUuid).toBe(fileUuid);

    // Reject malformed folder UUID, non-UUID filename, extra segments, and non-PDF extension
    expect(validatePerformanceDocumentStoragePath(`invalid/${appA}/${fileUuid}.pdf`).valid).toBe(
      false,
    );
    expect(validatePerformanceDocumentStoragePath(`${compA}/${appA}/evaluation.pdf`).valid).toBe(
      false,
    );
    expect(
      validatePerformanceDocumentStoragePath(`${compA}/${appA}/extra/${fileUuid}.pdf`).valid,
    ).toBe(false);
    expect(validatePerformanceDocumentStoragePath(`${compA}/${appA}/${fileUuid}.docx`).valid).toBe(
      false,
    );
  });

  it("authorizes active HR of the owning company and denies cross-company application IDs, Talents, and Platform Admins", () => {
    const validPath = `${compA}/${appA}/${fileUuid}.pdf`;

    expect(
      canAccessPerformanceDocumentObject({
        objectName: validPath,
        actorCompanyRole: "hr_recruiter",
        actorMemberStatus: "active",
        actorCompanyId: compA,
        companyStatus: "active",
        applicationIdInDb: appA,
        applicationProjectCompanyId: compA,
      }),
    ).toBe(true);

    // Cross-company attack: Company A HR tries to upload/read under Company A's folder for Company B's application
    expect(
      canAccessPerformanceDocumentObject({
        objectName: validPath,
        actorCompanyRole: "hr_admin",
        actorMemberStatus: "active",
        actorCompanyId: compA,
        companyStatus: "active",
        applicationIdInDb: appA,
        applicationProjectCompanyId: compB,
      }),
    ).toBe(false);

    // Talent and Platform Admin are strictly denied
    expect(
      canAccessPerformanceDocumentObject({
        objectName: validPath,
        actorCompanyRole: "talent",
        actorCompanyId: compA,
        applicationIdInDb: appA,
        applicationProjectCompanyId: compA,
      }),
    ).toBe(false);
    expect(
      canAccessPerformanceDocumentObject({
        objectName: validPath,
        actorCompanyRole: "platform_admin",
        actorCompanyId: compA,
        applicationIdInDb: appA,
        applicationProjectCompanyId: compA,
      }),
    ).toBe(false);
  });
});

describe("Application Column-Level Update & CV Snapshot Transition Guards", () => {
  const baseRow: ApplicationRowState = {
    id: appA,
    projectId: "proj-1",
    talentId: "talent-1",
    status: "pending",
    message: "Initial application message",
    matchScore: 88,
    candidateCvId: "cv-1",
    createdAt: "2026-11-25T10:00:00Z",
  };

  it("allows HR to update status only, and rejects HR attempts to modify talent_id, project_id, candidate_cv_id, message, or match_score", () => {
    expect(
      validateApplicationUpdate({
        oldRow: baseRow,
        newRow: { ...baseRow, status: "accepted" },
        actorUserId: "hr-1",
        actorIsAuthorizedCompanyHr: true,
        talentCurrentCvId: "cv-1",
        newCvCandidateId: "talent-1",
      }).allowed,
    ).toBe(true);

    for (const mutatedField of [
      { talentId: "talent-2" },
      { projectId: "proj-2" },
      { candidateCvId: "cv-2" },
      { message: "Tampered message" },
      { matchScore: 100 },
    ]) {
      const res = validateApplicationUpdate({
        oldRow: baseRow,
        newRow: { ...baseRow, status: "accepted", ...mutatedField },
        actorUserId: "hr-1",
        actorIsAuthorizedCompanyHr: true,
        talentCurrentCvId: "cv-2",
        newCvCandidateId: "talent-1",
      });
      expect(res.allowed).toBe(false);
    }
  });

  it("denies Platform Admin from modifying application status", () => {
    const res = validateApplicationUpdate({
      oldRow: baseRow,
      newRow: { ...baseRow, status: "accepted" },
      actorUserId: "platform-admin-1",
      actorIsPlatformAdmin: true,
      actorIsAuthorizedCompanyHr: false,
      talentCurrentCvId: "cv-1",
      newCvCandidateId: "talent-1",
    });
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("Platform Admin");
  });

  it("allows Talent to update candidate_cv_id ONLY on withdrawn -> pending re-apply when matching their own current_cv_id", () => {
    const withdrawnRow: ApplicationRowState = { ...baseRow, status: "withdrawn" };

    // Valid re-apply with new current CV owned by the same talent
    expect(
      validateApplicationUpdate({
        oldRow: withdrawnRow,
        newRow: { ...withdrawnRow, status: "pending", candidateCvId: "cv-2", matchScore: 92 },
        actorUserId: "talent-1",
        actorIsTalentBaseRole: true,
        talentCurrentCvId: "cv-2",
        newCvCandidateId: "talent-1",
      }).allowed,
    ).toBe(true);

    // Rejected if new CV belongs to another talent or does not match current_cv_id
    expect(
      validateApplicationUpdate({
        oldRow: withdrawnRow,
        newRow: { ...withdrawnRow, status: "pending", candidateCvId: "cv-foreign" },
        actorUserId: "talent-1",
        actorIsTalentBaseRole: true,
        talentCurrentCvId: "cv-foreign",
        newCvCandidateId: "talent-other",
      }).allowed,
    ).toBe(false);

    // Rejected if Talent tries to change candidate_cv_id while application is still pending
    expect(
      validateApplicationUpdate({
        oldRow: baseRow,
        newRow: { ...baseRow, candidateCvId: "cv-2" },
        actorUserId: "talent-1",
        actorIsTalentBaseRole: true,
        talentCurrentCvId: "cv-2",
        newCvCandidateId: "talent-1",
      }).allowed,
    ).toBe(false);
  });
});
