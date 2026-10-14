import { describe, expect, it } from "vitest";
import { HELPDESK_CATEGORIES, helpdeskSchema } from "./helpdesk";
import { HELPDESK_EMAIL, SHOW_MATCH_TO_TALENT } from "@/lib/config";
import { sanitizeProjectForTalent } from "@/lib/talent-project-utils";
import type { ProjectWithMatch } from "@/app/talent/projects/actions";

describe("helpdeskSchema", () => {
  it("accepts every category and a valid description", () => {
    for (const category of HELPDESK_CATEGORIES) {
      expect(helpdeskSchema.safeParse({ category, description: "Kendala terjadi saat project dibuka." }).success).toBe(true);
    }
  });

  it("matches required 5 categories", () => {
    expect([...HELPDESK_CATEGORIES]).toEqual([
      "Pembayaran",
      "Lamaran",
      "Project",
      "Akun",
      "Lainnya",
    ]);
  });

  it("rejects descriptions shorter than 20 characters and invalid IDs", () => {
    expect(helpdeskSchema.safeParse({ category: "Akun", description: "Terlalu pendek" }).success).toBe(false);
    expect(
      helpdeskSchema.safeParse({
        category: "Akun",
        description: "Saya tidak dapat masuk ke akun saya.",
        applicationId: "bukan-uuid",
      }).success
    ).toBe(false);
  });

  it("uses default HELPDESK_EMAIL when env is unset", () => {
    expect(HELPDESK_EMAIL).toBeTruthy();
    expect(HELPDESK_EMAIL).toContain("@");
  });
});

describe("Talent Match Visibility config and sanitize", () => {
  it("SHOW_MATCH_TO_TALENT is false by default", () => {
    expect(SHOW_MATCH_TO_TALENT).toBe(false);
  });

  it("sanitizeProjectForTalent removes all match scores and talent status indicators", () => {
    const rawProject: ProjectWithMatch = {
      id: "11111111-1111-4111-8111-111111111111",
      vendorId: "vendor-1",
      title: "Fullstack Web",
      description: "Deskripsi project",
      difficulty: "intermediate",
      type: "freelance",
      mode: "remote",
      durationWeeks: 4,
      hoursPerWeek: 20,
      paymentEnabled: true,
      portfolioRequired: false,
      rewardAmount: 2000000,
      rewardNote: "Bonus bila tepat waktu",
      deadline: "2026-11-01",
      status: "open",
      createdAt: "2026-10-01",
      vendor: {
        userId: "vendor-1",
        organizationName: "PT Maju",
        description: null,
        website: null,
        location: "Jakarta",
      },
      skills: [
        {
          skillId: 1,
          name: "React",
          category: "Frontend",
          minLevel: "intermediate",
          isRequired: true,
          talentStatus: {
            possessed: true,
            talentLevel: "intermediate",
            isAdequate: true,
          },
        },
        {
          skillId: 2,
          name: "Node.js",
          category: "Backend",
          minLevel: "intermediate",
          isRequired: false,
          talentStatus: {
            possessed: false,
            isAdequate: false,
          },
        },
      ],
      matchResult: {
        score: 85,
        breakdown: { skill: 90, levelFit: 80, availability: 100, rating: 70 },
        matchedSkills: ["React"],
        missingSkills: ["Node.js"],
        underLevelSkills: [],
        explanation: "Sangat cocok",
      },
      textSimilarityScore: 75,
      recommendationScore: 82,
    };

    const sanitized = sanitizeProjectForTalent(rawProject);

    expect(sanitized.id).toBe(rawProject.id);
    expect(sanitized.title).toBe(rawProject.title);
    expect(sanitized).not.toHaveProperty("matchResult");
    expect(sanitized).not.toHaveProperty("textSimilarityScore");
    expect(sanitized).not.toHaveProperty("recommendationScore");

    for (const skill of sanitized.skills) {
      expect(skill).not.toHaveProperty("talentStatus");
      expect(skill).toHaveProperty("skillId");
      expect(skill).toHaveProperty("name");
      expect(skill).toHaveProperty("minLevel");
      expect(skill).toHaveProperty("isRequired");
    }
  });
});
