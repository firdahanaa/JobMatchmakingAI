import type {
  EducationHistoryItem,
  WorkExperienceItem,
} from "@/types/database";
import type { StructuredCvData } from "@/lib/cv/processing";
import type { SkillLevel } from "@/lib/matching/types";

export interface CvScreeningEvidenceItem {
  category: "skill" | "experience" | "education" | "summary";
  label: string;
  pageNumber: number | null;
  sectionLabel: string;
  excerpt: string;
}

export interface AiCvScreeningReport {
  overallScore: number;
  criteriaBreakdown: {
    requiredAndPreferredSkillsScore: number;
    competencyLevelFitScore: number;
    workModeAndAvailabilityScore: number;
    trackRecordAndCvEvidenceScore: number;
  };
  matchedSkills: string[];
  cvDetectedSkills: string[];
  missingSkills: string[];
  underLevelSkills: {
    name: string;
    has: SkillLevel;
    needs: SkillLevel;
  }[];
  relevantExperience: string[];
  relevantQualifications: string[];
  cvEvidence: CvScreeningEvidenceItem[];
  candidateSummary: string;
  explanation: string;
  cvPageCount: number | null;
  hasExtractedCvText: boolean;
}

export interface EvaluateCvScreeningInput {
  candidateName: string;
  vacancyTitle: string;
  deterministicScore: number;
  matchBreakdown: {
    skill: number;
    levelFit: number;
    availability: number;
    rating: number;
  };
  projectSkills: {
    name: string;
    minLevel: SkillLevel;
    isRequired: boolean;
  }[];
  matchedSkills: string[];
  missingSkills: string[];
  underLevelSkills: {
    name: string;
    has: SkillLevel;
    needs: SkillLevel;
  }[];
  profileHeadline: string | null;
  profileEducation: string | null;
  profileEducationHistory: EducationHistoryItem[];
  profileWorkExperience: WorkExperienceItem[];
  extractedCvText: string | null;
  structuredCvData: Partial<StructuredCvData> | null;
}

function escapeRegExp(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Estimates which PDF page a line belongs to based on total line count and pageCount.
 */
function estimatePageForLine(
  lineIndex: number,
  totalLines: number,
  pageCount: number,
): number {
  if (pageCount <= 1 || totalLines <= 1) return 1;
  const ratio = lineIndex / Math.max(1, totalLines - 1);
  return Math.min(pageCount, Math.max(1, Math.floor(ratio * pageCount) + 1));
}

/**
 * Deterministically evaluates a candidate's application and extracted CV snapshot
 * against HR-configured vacancy criteria and produces evidence references & summary.
 */
export function evaluateApplicantCvScreening(
  input: EvaluateCvScreeningInput,
): AiCvScreeningReport {
  const rawText = (input.extractedCvText || "").trim();
  const lines = rawText
    ? rawText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const pageCount =
    input.structuredCvData?.pageCount && input.structuredCvData.pageCount > 0
      ? input.structuredCvData.pageCount
      : lines.length > 0
      ? 1
      : null;

  const cvEvidence: CvScreeningEvidenceItem[] = [];
  const cvDetectedSkills: string[] = [];

  // 1. Scan CV text for required & preferred project skills and record evidence + page ref
  for (const projectSkill of input.projectSkills) {
    const skillName = projectSkill.name.trim();
    if (!skillName) continue;

    // Support compound skill names like "HTML/CSS" or "PHP/Laravel"
    const tokens = skillName
      .split("/")
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
    const searchTokens = tokens.length > 0 ? tokens : [skillName];

    let foundInCv = false;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const matchesToken = searchTokens.some((token) => {
        const pattern = new RegExp(`(^|[^a-zA-Z0-9])${escapeRegExp(token)}([^a-zA-Z0-9]|$)`, "i");
        return pattern.test(line);
      });

      if (matchesToken) {
        foundInCv = true;
        const pageNum = pageCount ? estimatePageForLine(i, lines.length, pageCount) : 1;
        cvEvidence.push({
          category: "skill",
          label: `${projectSkill.name} (${projectSkill.isRequired ? "Wajib" : "Preferred"})`,
          pageNumber: pageNum,
          sectionLabel: `CV Halaman ${pageNum}`,
          excerpt: line.length > 160 ? `${line.slice(0, 157)}...` : line,
        });
        break;
      }
    }

    if (foundInCv) {
      cvDetectedSkills.push(projectSkill.name);
    }
  }

  // Merge profile matched skills with CV-detected skills without duplicates
  const combinedMatchedSet = new Set<string>([
    ...input.matchedSkills,
    ...cvDetectedSkills,
  ]);
  const finalMatchedSkills = Array.from(combinedMatchedSet);

  const finalMissingSkills = input.missingSkills.filter(
    (skillName) => !combinedMatchedSet.has(skillName),
  );

  // 2. Relevant Experience (from structured CV workExperience + profile workExperience)
  const relevantExperience: string[] = [];
  for (const exp of input.profileWorkExperience) {
    const period =
      exp.startDate || exp.endDate || exp.isCurrent
        ? ` (${exp.startDate || "—"} – ${exp.isCurrent ? "Sekarang" : exp.endDate || "—"})`
        : "";
    const summary = exp.description ? ` — ${exp.description}` : "";
    relevantExperience.push(`${exp.role} di ${exp.company}${period}${summary}`);
  }

  const cvWorkLines = input.structuredCvData?.workExperience || [];
  for (const cvExpLine of cvWorkLines.slice(0, 4)) {
    if (
      cvExpLine.length >= 6 &&
      !relevantExperience.some((existing) =>
        existing.toLowerCase().includes(cvExpLine.toLowerCase()),
      )
    ) {
      relevantExperience.push(cvExpLine);
    }
  }

  if (cvWorkLines.length > 0) {
    const firstExpLine = cvWorkLines[0];
    const lineIdx = lines.findIndex((l) => l.includes(firstExpLine));
    const pageNum =
      pageCount && lineIdx >= 0
        ? estimatePageForLine(lineIdx, lines.length, pageCount)
        : pageCount
        ? 1
        : null;
    cvEvidence.push({
      category: "experience",
      label: "Pengalaman Kerja pada CV",
      pageNumber: pageNum,
      sectionLabel: pageNum ? `CV Halaman ${pageNum} · Work Experience` : "Profil Kandidat",
      excerpt:
        cvWorkLines.slice(0, 2).join(" · ").slice(0, 180) ||
        "Riwayat pengalaman kerja terdeteksi pada dokumen CV.",
    });
  }

  // 3. Relevant Qualifications & Education
  const relevantQualifications: string[] = [];
  if (input.profileEducation) {
    relevantQualifications.push(input.profileEducation);
  }
  for (const edu of input.profileEducationHistory) {
    const label = `${edu.degree} ${edu.fieldOfStudy} — ${edu.institution}`.trim();
    if (!relevantQualifications.includes(label)) {
      relevantQualifications.push(label);
    }
  }

  const cvEduLines = input.structuredCvData?.educationHistory || [];
  for (const eduLine of cvEduLines.slice(0, 3)) {
    if (
      eduLine.length >= 4 &&
      !relevantQualifications.some((q) =>
        q.toLowerCase().includes(eduLine.toLowerCase()),
      )
    ) {
      relevantQualifications.push(eduLine);
    }
  }

  if (cvEduLines.length > 0) {
    const firstEduLine = cvEduLines[0];
    const lineIdx = lines.findIndex((l) => l.includes(firstEduLine));
    const pageNum =
      pageCount && lineIdx >= 0
        ? estimatePageForLine(lineIdx, lines.length, pageCount)
        : pageCount
        ? 1
        : null;
    cvEvidence.push({
      category: "education",
      label: "Kualifikasi & Pendidikan pada CV",
      pageNumber: pageNum,
      sectionLabel: pageNum ? `CV Halaman ${pageNum} · Education` : "Profil Kandidat",
      excerpt: cvEduLines.slice(0, 2).join(" · ").slice(0, 180),
    });
  }

  // Fallback evidence if CV has text but no section header matched yet
  if (cvEvidence.length === 0 && lines.length > 0) {
    cvEvidence.push({
      category: "summary",
      label: "Ringkasan Dokumen CV",
      pageNumber: 1,
      sectionLabel: "CV Halaman 1 · Ringkasan",
      excerpt: lines.slice(0, 3).join(" · ").slice(0, 180),
    });
  }

  // 4. Deterministic Weighted Score Adjustment with CV Evidence Verification
  // If CV explicitly confirms skills that were missing from profile tags, compute deterministic uplift
  const totalProjectSkills = Math.max(1, input.projectSkills.length);
  const newlyVerifiedByCvCount = finalMatchedSkills.length - input.matchedSkills.length;
  const cvSkillBonus =
    newlyVerifiedByCvCount > 0
      ? Math.round((newlyVerifiedByCvCount / totalProjectSkills) * 35)
      : 0;

  const overallScore = Math.min(100, Math.max(0, Math.round(input.deterministicScore + cvSkillBonus)));

  // 5. Generate AI Candidate Summary & Grounded Explanation
  const totalRequired = input.projectSkills.filter((s) => s.isRequired).length;
  const matchedRequired = input.projectSkills.filter(
    (s) => s.isRequired && combinedMatchedSet.has(s.name),
  ).length;

  const headlineSegment = input.profileHeadline
    ? ` (${input.profileHeadline})`
    : "";
  const cvEvidenceSegment =
    lines.length > 0
      ? `Dari hasil ekstraksi dokumen CV (${pageCount || 1} halaman), sistem menemukan ${cvEvidence.length} bukti rujukan langsung${
          cvDetectedSkills.length > 0
            ? ` termasuk verifikasi keahlian: ${cvDetectedSkills.join(", ")}`
            : ""
        }.`
      : "Evaluasi saat ini didasarkan pada profil kompetensi terstruktur kandidat.";

  const candidateSummary = `${input.candidateName}${headlineSegment} memperoleh skor AI Screening deterministik sebesar ${overallScore}% untuk posisi ${input.vacancyTitle}. Kandidat memenuhi ${matchedRequired} dari ${totalRequired} keahlian wajib (${finalMatchedSkills.length}/${input.projectSkills.length} total skill lowongan). ${cvEvidenceSegment}`;

  const explanationParts: string[] = [
    `Skor kecocokan kompetensi: ${Math.min(100, input.matchBreakdown.skill + cvSkillBonus)}% (bobot 55%), kecukupan level keahlian: ${input.matchBreakdown.levelFit}% (bobot 20%), ketersediaan & mode kerja: ${input.matchBreakdown.availability}% (bobot 15%), serta rekam jejak/rating: ${input.matchBreakdown.rating}% (bobot 10%).`,
  ];

  if (finalMatchedSkills.length > 0) {
    explanationParts.push(`Skill terpenuhi: ${finalMatchedSkills.join(", ")}.`);
  }
  if (input.underLevelSkills.length > 0) {
    explanationParts.push(
      `Skill di bawah level minimum: ${input.underLevelSkills
        .map((u) => `${u.name} (${u.has} < ${u.needs})`)
        .join(", ")}.`,
    );
  }
  if (finalMissingSkills.length > 0) {
    explanationParts.push(`Skill belum tercantum: ${finalMissingSkills.join(", ")}.`);
  }

  return {
    overallScore,
    criteriaBreakdown: {
      requiredAndPreferredSkillsScore: Math.min(100, input.matchBreakdown.skill + cvSkillBonus),
      competencyLevelFitScore: input.matchBreakdown.levelFit,
      workModeAndAvailabilityScore: input.matchBreakdown.availability,
      trackRecordAndCvEvidenceScore: input.matchBreakdown.rating,
    },
    matchedSkills: finalMatchedSkills,
    cvDetectedSkills,
    missingSkills: finalMissingSkills,
    underLevelSkills: input.underLevelSkills,
    relevantExperience,
    relevantQualifications,
    cvEvidence,
    candidateSummary,
    explanation: explanationParts.join(" "),
    cvPageCount: pageCount,
    hasExtractedCvText: lines.length > 0,
  };
}
