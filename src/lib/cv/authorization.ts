export function canVendorAccessApplicationCv(input: {
  userRole: string;
  vendorId: string;
  projectVendorId: string;
  applicationCandidateId: string;
  cvCandidateId: string;
  applicationCvId: string | null;
  cvId: string;
}): boolean {
  return (
    input.userRole === "vendor" &&
    input.vendorId === input.projectVendorId &&
    input.applicationCvId !== null &&
    input.applicationCvId === input.cvId &&
    input.applicationCandidateId === input.cvCandidateId
  );
}
