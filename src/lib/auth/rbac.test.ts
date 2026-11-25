import { describe, expect, it } from "vitest";
import {
  canPerformAction,
  validateLastOwnerInvariant,
  validateProjectCompanyOwnership,
  type ActorAuthorizationContext,
} from "./rbac";

const companyA = "11111111-1111-4000-8000-000000000001";
const companyB = "22222222-2222-4000-8000-000000000002";

const talentActor: ActorAuthorizationContext = {
  userId: "talent-1",
  baseRole: "talent",
  platformRole: "user",
  memberships: [],
};

const ownerActorA: ActorAuthorizationContext = {
  userId: "owner-a",
  baseRole: "vendor",
  platformRole: "user",
  memberships: [
    {
      companyId: companyA,
      companyStatus: "active",
      role: "company_owner",
      status: "active",
    },
  ],
};

const hrAdminActorA: ActorAuthorizationContext = {
  userId: "hr-admin-a",
  baseRole: "vendor",
  platformRole: "user",
  memberships: [
    {
      companyId: companyA,
      companyStatus: "active",
      role: "hr_admin",
      status: "active",
    },
  ],
};

const hrRecruiterActorA: ActorAuthorizationContext = {
  userId: "hr-recruiter-a",
  baseRole: "vendor",
  platformRole: "user",
  memberships: [
    {
      companyId: companyA,
      companyStatus: "active",
      role: "hr_recruiter",
      status: "active",
    },
  ],
};

const platformAdminActor: ActorAuthorizationContext = {
  userId: "platform-admin-1",
  baseRole: "vendor",
  platformRole: "platform_admin",
  memberships: [],
};

describe("Phase 1 RBAC Permission Matrix & Cross-Company Isolation", () => {
  it("allows Talent to manage own profile and submit applications, but denies all HR/Company actions", () => {
    expect(canPerformAction(talentActor, "talent:manage_own_profile")).toBe(true);
    expect(canPerformAction(talentActor, "talent:submit_application", companyA)).toBe(true);
    expect(canPerformAction(talentActor, "company:view_dashboard", companyA)).toBe(false);
    expect(canPerformAction(talentActor, "vacancy:create", companyA)).toBe(false);
    expect(canPerformAction(talentActor, "applicant:view", companyA)).toBe(false);
    expect(canPerformAction(talentActor, "performance_doc:view", companyA)).toBe(false);
    expect(canPerformAction(talentActor, "platform:manage")).toBe(false);
  });

  it("enforces conflict-of-interest: multi-context Talent who is an HR member of Company A cannot apply to Company A, but can apply to Company B", () => {
    const multiContextTalent: ActorAuthorizationContext = {
      userId: "talent-hr-a",
      baseRole: "talent",
      platformRole: "user",
      memberships: [
        {
          companyId: companyA,
          companyStatus: "active",
          role: "hr_recruiter",
          status: "active",
        },
      ],
    };

    expect(canPerformAction(multiContextTalent, "applicant:view", companyA)).toBe(true);
    expect(canPerformAction(multiContextTalent, "talent:submit_application", companyA)).toBe(false);
    expect(canPerformAction(multiContextTalent, "talent:submit_application", companyB)).toBe(true);
  });

  it("distinguishes Company Owner, HR Admin, and HR Recruiter permissions within their own company", () => {
    // Company Owner: full access including team management & workspace settings
    expect(canPerformAction(ownerActorA, "company:manage_team", companyA)).toBe(true);
    expect(canPerformAction(ownerActorA, "company:manage_settings", companyA)).toBe(true);
    expect(canPerformAction(ownerActorA, "vacancy:create", companyA)).toBe(true);
    expect(canPerformAction(ownerActorA, "evaluation:configure", companyA)).toBe(true);
    expect(canPerformAction(ownerActorA, "applicant:update_status", companyA)).toBe(true);

    // HR Admin: can create/edit vacancies and configure evaluation, but cannot manage team or company settings
    expect(canPerformAction(hrAdminActorA, "company:manage_team", companyA)).toBe(false);
    expect(canPerformAction(hrAdminActorA, "company:manage_settings", companyA)).toBe(false);
    expect(canPerformAction(hrAdminActorA, "vacancy:create", companyA)).toBe(true);
    expect(canPerformAction(hrAdminActorA, "evaluation:configure", companyA)).toBe(true);
    expect(canPerformAction(hrAdminActorA, "applicant:update_status", companyA)).toBe(true);

    // HR Recruiter: can view vacancies, review applicants, update recruitment status, and upload performance docs,
    // but cannot create/delete vacancies or configure evaluation weights
    expect(canPerformAction(hrRecruiterActorA, "vacancy:create", companyA)).toBe(false);
    expect(canPerformAction(hrRecruiterActorA, "vacancy:delete", companyA)).toBe(false);
    expect(canPerformAction(hrRecruiterActorA, "evaluation:configure", companyA)).toBe(false);
    expect(canPerformAction(hrRecruiterActorA, "vacancy:view_all", companyA)).toBe(true);
    expect(canPerformAction(hrRecruiterActorA, "applicant:view", companyA)).toBe(true);
    expect(canPerformAction(hrRecruiterActorA, "applicant:update_status", companyA)).toBe(true);
    expect(canPerformAction(hrRecruiterActorA, "performance_doc:upload", companyA)).toBe(true);
  });

  it("strictly denies cross-company access for Company Owner, HR Admin, and HR Recruiter", () => {
    expect(canPerformAction(ownerActorA, "company:view_dashboard", companyB)).toBe(false);
    expect(canPerformAction(ownerActorA, "vacancy:edit", companyB)).toBe(false);
    expect(canPerformAction(hrAdminActorA, "applicant:view", companyB)).toBe(false);
    expect(canPerformAction(hrRecruiterActorA, "applicant:update_status", companyB)).toBe(false);
    expect(canPerformAction(hrRecruiterActorA, "applicant:download_cv", companyB)).toBe(false);
    expect(canPerformAction(hrRecruiterActorA, "performance_doc:view", companyB)).toBe(false);
  });

  it("revokes all company permissions when membership is disabled or company is deactivated", () => {
    const disabledMember: ActorAuthorizationContext = {
      ...hrAdminActorA,
      memberships: [
        {
          companyId: companyA,
          companyStatus: "active",
          role: "hr_admin",
          status: "disabled",
        },
      ],
    };
    const deactivatedCompanyOwner: ActorAuthorizationContext = {
      ...ownerActorA,
      memberships: [
        {
          companyId: companyA,
          companyStatus: "deactivated",
          role: "company_owner",
          status: "active",
        },
      ],
    };

    expect(canPerformAction(disabledMember, "vacancy:create", companyA)).toBe(false);
    expect(canPerformAction(disabledMember, "applicant:view", companyA)).toBe(false);
    expect(canPerformAction(deactivatedCompanyOwner, "vacancy:create", companyA)).toBe(false);
  });

  it("enforces Platform Admin boundaries: audit & platform management allowed, but application status updates and raw document downloads denied", () => {
    expect(canPerformAction(platformAdminActor, "platform:manage")).toBe(true);
    expect(canPerformAction(platformAdminActor, "company:deactivate", companyA)).toBe(true);
    expect(canPerformAction(platformAdminActor, "applicant:update_status", companyA)).toBe(false);
    expect(canPerformAction(platformAdminActor, "applicant:download_cv", companyA)).toBe(false);
    expect(canPerformAction(platformAdminActor, "performance_doc:view", companyA)).toBe(false);
  });
});

describe("Phase 1 Last-Owner Protection & Project Ownership Consistency", () => {
  it("prevents disabling, demoting, or deleting the last active company_owner of an active company", () => {
    const singleOwnerList = [
      { userId: "owner-1", role: "company_owner" as const, status: "active" as const },
      { userId: "admin-1", role: "hr_admin" as const, status: "active" as const },
    ];

    expect(
      validateLastOwnerInvariant({
        companyStatus: "active",
        existingMembers: singleOwnerList,
        targetUserId: "owner-1",
        nextStatus: "disabled",
      }).valid,
    ).toBe(false);

    expect(
      validateLastOwnerInvariant({
        companyStatus: "active",
        existingMembers: singleOwnerList,
        targetUserId: "owner-1",
        nextRole: "hr_admin",
      }).valid,
    ).toBe(false);

    // When a second active owner exists, disabling the first owner succeeds,
    // and a subsequent attempt to disable the second owner is rejected (serialized concurrency safety)
    const twoOwnersList = [
      ...singleOwnerList,
      { userId: "owner-2", role: "company_owner" as const, status: "active" as const },
    ];

    const firstTx = validateLastOwnerInvariant({
      companyStatus: "active",
      existingMembers: twoOwnersList,
      targetUserId: "owner-1",
      nextStatus: "disabled",
    });
    expect(firstTx.valid).toBe(true);

    const stateAfterFirstTx = twoOwnersList.map((m) =>
      m.userId === "owner-1" ? { ...m, status: "disabled" as const } : m,
    );
    const secondConcurrentTx = validateLastOwnerInvariant({
      companyStatus: "active",
      existingMembers: stateAfterFirstTx,
      targetUserId: "owner-2",
      nextStatus: "disabled",
    });
    expect(secondConcurrentTx.valid).toBe(false);
  });

  it("enforces 1:1 consistency between project.company_id and project.vendor_id", () => {
    const companies = [
      { id: companyA, legacyVendorUserId: "vendor-a" },
      { id: companyB, legacyVendorUserId: "vendor-b" },
    ];

    // Legacy insert with only vendor_id -> auto-populates company_id
    const fromVendorOnly = validateProjectCompanyOwnership({
      projectVendorId: "vendor-a",
      projectCompanyId: null,
      companies,
    });
    expect(fromVendorOnly.valid).toBe(true);
    expect(fromVendorOnly.resolvedCompanyId).toBe(companyA);

    // HR insert with only company_id -> auto-populates vendor_id
    const fromCompanyOnly = validateProjectCompanyOwnership({
      projectVendorId: null,
      projectCompanyId: companyB,
      companies,
    });
    expect(fromCompanyOnly.valid).toBe(true);
    expect(fromCompanyOnly.resolvedVendorId).toBe("vendor-b");

    // Mismatched vendor_id and company_id -> rejected
    const mismatched = validateProjectCompanyOwnership({
      projectVendorId: "vendor-a",
      projectCompanyId: companyB,
      companies,
    });
    expect(mismatched.valid).toBe(false);
    expect(mismatched.error).toContain("Inconsistent project ownership");
  });
});
