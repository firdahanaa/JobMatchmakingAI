import { describe, expect, it } from "vitest";
import { canVendorAccessApplicationCv } from "./authorization";

const authorizedApplication = {
  userRole: "vendor",
  vendorId: "vendor-a",
  projectVendorId: "vendor-a",
  applicationCandidateId: "talent-a",
  cvCandidateId: "talent-a",
  applicationCvId: "cv-a",
  cvId: "cv-a",
};

describe("Applicant CV authorization", () => {
  it("allows the vendor who owns the applicant's project to access its CV snapshot", () => {
    expect(canVendorAccessApplicationCv(authorizedApplication)).toBe(true);
  });

  it("denies other vendors, non-vendors, and mismatched CV or candidate records", () => {
    expect(
      canVendorAccessApplicationCv({ ...authorizedApplication, vendorId: "vendor-b" }),
    ).toBe(false);
    expect(
      canVendorAccessApplicationCv({ ...authorizedApplication, projectVendorId: "vendor-b" }),
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
