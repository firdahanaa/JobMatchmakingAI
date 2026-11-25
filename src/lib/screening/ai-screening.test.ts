import { describe, expect, it } from "vitest";
import { evaluateApplicantCvScreening } from "./ai-screening";

describe("AI CV Screening & Evidence Evaluation Engine", () => {
  it("evaluates CV text deterministically, extracts page evidence, and detects skills", () => {
    const report = evaluateApplicantCvScreening({
      candidateName: "Raka Pratama",
      vacancyTitle: "Frontend Developer",
      deterministicScore: 82,
      matchBreakdown: {
        skill: 80,
        levelFit: 85,
        availability: 100,
        rating: 60,
      },
      projectSkills: [
        { name: "React", minLevel: "intermediate", isRequired: true },
        { name: "TypeScript", minLevel: "intermediate", isRequired: true },
        { name: "Next.js", minLevel: "beginner", isRequired: false },
      ],
      matchedSkills: ["React", "TypeScript"],
      missingSkills: ["Next.js"],
      underLevelSkills: [],
      profileHeadline: "Frontend Engineer",
      profileEducation: "S1 Teknik Informatika - ITB",
      profileEducationHistory: [
        {
          institution: "Institut Teknologi Bandung",
          degree: "S1",
          fieldOfStudy: "Teknik Informatika",
          startDate: "2020",
          endDate: "2024",
        },
      ],
      profileWorkExperience: [
        {
          company: "PT Digital Nusantara",
          role: "Frontend Developer Intern",
          startDate: "2023-06",
          endDate: "2023-12",
          isCurrent: false,
          description: "Membangun dashboard berbasis React dan TypeScript.",
        },
      ],
      extractedCvText: [
        "Raka Pratama",
        "Professional Summary",
        "Frontend Developer berpengalaman membangun aplikasi web dengan React, TypeScript, dan Next.js.",
        "Work Experience",
        "Frontend Developer Intern - PT Digital Nusantara (2023)",
        "Mengembangkan komponen UI interaktif menggunakan Next.js App Router dan Tailwind CSS.",
        "Education",
        "S1 Teknik Informatika - Institut Teknologi Bandung",
      ].join("\n"),
      structuredCvData: {
        pageCount: 2,
        professionalSummary: [
          "Frontend Developer berpengalaman membangun aplikasi web dengan React, TypeScript, dan Next.js.",
        ],
        workExperience: [
          "Frontend Developer Intern - PT Digital Nusantara (2023)",
          "Mengembangkan komponen UI interaktif menggunakan Next.js App Router dan Tailwind CSS.",
        ],
        educationHistory: ["S1 Teknik Informatika - Institut Teknologi Bandung"],
        skills: ["React", "TypeScript", "Next.js"],
      },
    });

    expect(report.hasExtractedCvText).toBe(true);
    expect(report.cvPageCount).toBe(2);
    expect(report.matchedSkills).toContain("React");
    expect(report.matchedSkills).toContain("TypeScript");
    expect(report.matchedSkills).toContain("Next.js");
    expect(report.missingSkills).toHaveLength(0);
    expect(report.overallScore).toBeGreaterThanOrEqual(82);
    expect(report.cvEvidence.length).toBeGreaterThan(0);
    expect(report.cvEvidence[0].pageNumber).toBeGreaterThanOrEqual(1);
    expect(report.candidateSummary).toContain("Raka Pratama");
    expect(report.candidateSummary).toContain("Frontend Developer");
  });

  it("handles applicants without extracted CV text gracefully using structured profile data", () => {
    const report = evaluateApplicantCvScreening({
      candidateName: "Siti Nadia",
      vacancyTitle: "UI/UX Designer",
      deterministicScore: 74,
      matchBreakdown: {
        skill: 75,
        levelFit: 70,
        availability: 80,
        rating: 60,
      },
      projectSkills: [
        { name: "Figma", minLevel: "intermediate", isRequired: true },
        { name: "UI/UX Design", minLevel: "intermediate", isRequired: true },
      ],
      matchedSkills: ["Figma"],
      missingSkills: ["UI/UX Design"],
      underLevelSkills: [],
      profileHeadline: "Product Designer",
      profileEducation: "S1 DKV",
      profileEducationHistory: [],
      profileWorkExperience: [],
      extractedCvText: null,
      structuredCvData: null,
    });

    expect(report.hasExtractedCvText).toBe(false);
    expect(report.overallScore).toBe(74);
    expect(report.matchedSkills).toEqual(["Figma"]);
    expect(report.missingSkills).toEqual(["UI/UX Design"]);
    expect(report.candidateSummary).toContain("Siti Nadia");
  });
});
