import { describe, it, expect } from "vitest";
import {
  calculateMatch,
  calculateSkillGap,
  calculateSkillScore,
  calculateLevelFitScore,
  calculateAvailabilityScore,
  calculateRatingScore,
  WEIGHTS,
} from "./index";
import type {
  TalentContext,
  ProjectContext,
} from "./types";

describe("Matching Engine: WEIGHTS", () => {
  it("memiliki total bobot tepat 1.0 (100%)", () => {
    const totalWeight =
      WEIGHTS.skill +
      WEIGHTS.levelFit +
      WEIGHTS.availability +
      WEIGHTS.rating;
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });
});

describe("Matching Engine: calculateSkillScore", () => {
  it("talent tanpa satu pun skill -> skill_score 0", () => {
    const talent: TalentContext = {
      skills: [],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: null,
    };
    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "Python", minLevel: "beginner", isRequired: true },
        { skillId: 2, name: "SQL", minLevel: "intermediate", isRequired: true },
      ],
      hoursPerWeek: 15,
      mode: "remote",
    };

    const score = calculateSkillScore(talent, project);
    expect(score).toBe(0);
  });

  it("skill required vs non-required berbobot berbeda (required=1.0, non-required=0.5)", () => {
    // Project: 1 skill required (bobot 1) dan 1 skill non-required (bobot 0.5)
    // Total bobot = 1.5
    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "React", minLevel: "beginner", isRequired: true },
        { skillId: 2, name: "Figma", minLevel: "beginner", isRequired: false },
      ],
      hoursPerWeek: 10,
      mode: "remote",
    };

    // Kasus A: Talent hanya memiliki skill required (earned = 1.0 / 1.5 = 66.67%)
    const talentRequiredOnly: TalentContext = {
      skills: [{ skillId: 1, name: "React", level: "beginner" }],
      hoursPerWeek: 10,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: null,
    };

    // Kasus B: Talent hanya memiliki skill non-required (earned = 0.5 / 1.5 = 33.33%)
    const talentOptionalOnly: TalentContext = {
      skills: [{ skillId: 2, name: "Figma", level: "beginner" }],
      hoursPerWeek: 10,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: null,
    };

    const scoreA = calculateSkillScore(talentRequiredOnly, project);
    const scoreB = calculateSkillScore(talentOptionalOnly, project);

    expect(scoreA).toBeCloseTo(66.67, 1);
    expect(scoreB).toBeCloseTo(33.33, 1);
    expect(scoreA).toBeGreaterThan(scoreB);
  });
});

describe("Matching Engine: calculateLevelFitScore", () => {
  it("level kurang 1 dan 2 tingkat", () => {
    // Project butuh Advanced (nilai numerik 3)
    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "React", minLevel: "advanced", isRequired: true },
      ],
      hoursPerWeek: 15,
      mode: "remote",
    };

    // Level >= min: Advanced (3) -> 100
    const talentAdvanced = {
      skills: [{ skillId: 1, name: "React", level: "advanced" as const }],
    };
    expect(calculateLevelFitScore(talentAdvanced, project)).toBe(100);

    // Kurang 1 tingkat: Intermediate (2) -> 50
    const talentIntermediate = {
      skills: [{ skillId: 1, name: "React", level: "intermediate" as const }],
    };
    expect(calculateLevelFitScore(talentIntermediate, project)).toBe(50);

    // Kurang 2 tingkat: Beginner (1) -> 0
    const talentBeginner = {
      skills: [{ skillId: 1, name: "React", level: "beginner" as const }],
    };
    expect(calculateLevelFitScore(talentBeginner, project)).toBe(0);

    // Skill tidak dimiliki -> 0
    const talentNoSkill = { skills: [] };
    expect(calculateLevelFitScore(talentNoSkill, project)).toBe(0);
  });
});

describe("Matching Engine: calculateAvailabilityScore", () => {
  it("memberikan skor 100 jika isAvailable, jam mencukupi, dan mode cocok", () => {
    const talent: TalentContext = {
      skills: [],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: null,
    };
    const project: ProjectContext = {
      skills: [],
      hoursPerWeek: 15,
      mode: "remote",
    };

    expect(calculateAvailabilityScore(talent, project)).toBe(100);
  });

  it("memberikan skor 100 jika jam atau preferensi mode talent bernilai null (fleksibel)", () => {
    const talent: TalentContext = {
      skills: [],
      hoursPerWeek: null,
      preferredMode: null,
      isAvailable: true,
      avgRating: null,
    };
    const project: ProjectContext = {
      skills: [],
      hoursPerWeek: 20,
      mode: "onsite",
    };

    expect(calculateAvailabilityScore(talent, project)).toBe(100);
  });

  it("memberikan skor 50 jika sebagian cocok (misal jam cukup tapi mode tidak cocok)", () => {
    const talent: TalentContext = {
      skills: [],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: null,
    };
    const project: ProjectContext = {
      skills: [],
      hoursPerWeek: 15,
      mode: "onsite", // onsite hanya cocok jika talent onsite atau null
    };

    // jam cocok (100) tapi mode tidak cocok (0) -> sebagian cocok = 50
    expect(calculateAvailabilityScore(talent, project)).toBe(50);
  });

  it("memberikan skor 0 jika isAvailable adalah false", () => {
    const talent: TalentContext = {
      skills: [],
      hoursPerWeek: 40,
      preferredMode: "remote",
      isAvailable: false,
      avgRating: null,
    };
    const project: ProjectContext = {
      skills: [],
      hoursPerWeek: 10,
      mode: "remote",
    };

    expect(calculateAvailabilityScore(talent, project)).toBe(0);
  });
});

describe("Matching Engine: calculateRatingScore", () => {
  it("avgRating null memakai nilai netral 60 (cold-start)", () => {
    expect(calculateRatingScore(null)).toBe(60);
    expect(calculateRatingScore(undefined)).toBe(60);
  });

  it("menghitung proporsi rating (rating / 5 * 100)", () => {
    expect(calculateRatingScore(5)).toBe(100);
    expect(calculateRatingScore(4)).toBe(80);
    expect(calculateRatingScore(3)).toBe(60);
    expect(calculateRatingScore(2.5)).toBe(50);
  });
});

describe("Matching Engine: calculateSkillGap", () => {
  it("mengidentifikasi missingSkills, underLevelSkills, matchedSkills, dan readinessPercent", () => {
    const talent: TalentContext = {
      skills: [
        { skillId: 1, name: "React", level: "advanced" },
        { skillId: 2, name: "TypeScript", level: "beginner" }, // underLevel (needs intermediate)
      ],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: 4.8,
    };

    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "React", minLevel: "intermediate", isRequired: true },
        { skillId: 2, name: "TypeScript", minLevel: "intermediate", isRequired: true },
        { skillId: 3, name: "Power BI", minLevel: "beginner", isRequired: false }, // missing
      ],
      hoursPerWeek: 15,
      mode: "remote",
    };

    const gap = calculateSkillGap(talent, project);

    expect(gap.matchedSkills).toEqual(["React"]);
    expect(gap.missingSkills).toEqual(["Power BI"]);
    expect(gap.underLevelSkills).toEqual([
      {
        name: "TypeScript",
        has: "beginner",
        needs: "intermediate",
      },
    ]);
    // 1 dari 3 skill memiliki level cukup -> 33%
    expect(gap.readinessPercent).toBe(33);
  });
});

describe("Matching Engine: calculateMatch (End-to-End)", () => {
  it("talent dengan semua skill dan level cukup -> skor tinggi (>= 90)", () => {
    const talent: TalentContext = {
      skills: [
        { skillId: 1, name: "React", level: "advanced" },
        { skillId: 2, name: "TypeScript", level: "intermediate" },
        { skillId: 3, name: "Figma", level: "beginner" },
      ],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: 5.0,
    };

    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "React", minLevel: "intermediate", isRequired: true },
        { skillId: 2, name: "TypeScript", minLevel: "intermediate", isRequired: true },
        { skillId: 3, name: "Figma", minLevel: "beginner", isRequired: false },
      ],
      hoursPerWeek: 15,
      mode: "remote",
    };

    const result = calculateMatch(talent, project);

    // skillScore = 100 (50)
    // levelFit = 100 (20)
    // availability = 100 (15)
    // rating = 100 (15)
    // total = 100
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBe(100);
    expect(result.breakdown.skill).toBe(100);
    expect(result.breakdown.levelFit).toBe(100);
    expect(result.breakdown.availability).toBe(100);
    expect(result.breakdown.rating).toBe(100);
    expect(result.matchedSkills).toHaveLength(3);
    expect(result.missingSkills).toHaveLength(0);
    expect(result.underLevelSkills).toHaveLength(0);
    expect(result.explanation).toContain("Luar biasa");
  });

  it("talent dengan rating null (cold-start) tetap mendapat skor tinggi jika skill dan availability cocok", () => {
    const talent: TalentContext = {
      skills: [
        { skillId: 1, name: "React", level: "intermediate" },
      ],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: null, // rating netral = 60 (60 * 0.15 = 9)
    };

    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "React", minLevel: "intermediate", isRequired: true },
      ],
      hoursPerWeek: 15,
      mode: "remote",
    };

    const result = calculateMatch(talent, project);
    // 50 (skill) + 20 (levelFit) + 15 (avail) + 9 (rating) = 94
    expect(result.score).toBe(94);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.breakdown.rating).toBe(60);
  });

  it("project tanpa skill (edge case) tidak membuat error/NaN", () => {
    const talent: TalentContext = {
      skills: [
        { skillId: 1, name: "React", level: "intermediate" },
      ],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: 4.0,
    };

    const emptyProject: ProjectContext = {
      skills: [],
      hoursPerWeek: 10,
      mode: "remote",
    };

    expect(() => calculateMatch(talent, emptyProject)).not.toThrow();
    const result = calculateMatch(talent, emptyProject);

    expect(Number.isNaN(result.score)).toBe(false);
    expect(Number.isNaN(result.breakdown.skill)).toBe(false);
    expect(Number.isNaN(result.breakdown.levelFit)).toBe(false);
    expect(result.matchedSkills).toHaveLength(0);
    expect(result.missingSkills).toHaveLength(0);
    expect(result.underLevelSkills).toHaveLength(0);
    expect(result.explanation).toContain("terbuka untuk semua talenta");
  });

  it("skor selalu berada di rentang 0-100", () => {
    // Skenario terburuk (skor minimal)
    const worstTalent: TalentContext = {
      skills: [],
      hoursPerWeek: 1,
      preferredMode: "onsite",
      isAvailable: false,
      avgRating: 0,
    };

    const highProject: ProjectContext = {
      skills: [
        { skillId: 1, name: "Python", minLevel: "advanced", isRequired: true },
        { skillId: 2, name: "SQL", minLevel: "advanced", isRequired: true },
      ],
      hoursPerWeek: 40,
      mode: "remote",
    };

    const worstResult = calculateMatch(worstTalent, highProject);
    expect(worstResult.score).toBeGreaterThanOrEqual(0);
    expect(worstResult.score).toBeLessThanOrEqual(100);

    // Skenario terbaik (skor maksimal)
    const bestTalent: TalentContext = {
      skills: [
        { skillId: 1, name: "Python", level: "advanced" },
        { skillId: 2, name: "SQL", level: "advanced" },
      ],
      hoursPerWeek: 50,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: 5.0,
    };

    const bestResult = calculateMatch(bestTalent, highProject);
    expect(bestResult.score).toBeGreaterThanOrEqual(0);
    expect(bestResult.score).toBeLessThanOrEqual(100);
    expect(bestResult.score).toBe(100);
  });

  it("menghasilkan pesan penjelasan yang konstruktif dan membangun", () => {
    const talent: TalentContext = {
      skills: [
        { skillId: 1, name: "Python", level: "beginner" },
        { skillId: 2, name: "SQL", level: "beginner" },
        { skillId: 3, name: "Excel", level: "beginner" },
      ],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: 4.5,
    };

    const project: ProjectContext = {
      skills: [
        { skillId: 1, name: "Python", minLevel: "beginner", isRequired: true },
        { skillId: 2, name: "SQL", minLevel: "beginner", isRequired: true },
        { skillId: 3, name: "Excel", minLevel: "beginner", isRequired: true },
        { skillId: 4, name: "Power BI", minLevel: "beginner", isRequired: true },
      ],
      hoursPerWeek: 15,
      mode: "remote",
    };

    const result = calculateMatch(talent, project);
    expect(result.explanation).toContain("Kamu memenuhi 3 dari 4 skill.");
    expect(result.explanation).toContain("Pelajari Power BI");
  });
});
