import {
  SKILL_LEVEL_NUMERIC,
  type TalentContext,
  type ProjectContext,
  type MatchResult,
  type TalentSkill,
} from "./types";
import { calculateSkillGap } from "./skillGap";

/**
 * Weights configuration for composite match score.
 * Easily adjusted in one single place according to PRD section 6.
 */
export const WEIGHTS = {
  skill: 0.50,
  levelFit: 0.20,
  availability: 0.15,
  rating: 0.15,
} as const;

/**
 * Helper to build a lookup map for talent skills by id and normalized name.
 */
function buildTalentSkillMap(skills: TalentSkill[]): Map<number | string, TalentSkill> {
  const map = new Map<number | string, TalentSkill>();
  for (const s of skills) {
    map.set(s.skillId, s);
    map.set(s.name.toLowerCase().trim(), s);
  }
  return map;
}

/**
 * Calculates skill score (0-100).
 * Required skills have weight 1.0, non-required skills have weight 0.5.
 * Score = earned weight of possessed skills / total project skill weight * 100.
 */
export function calculateSkillScore(
  talent: TalentContext | { skills: TalentSkill[] },
  project: ProjectContext | { skills: ProjectContext["skills"] }
): number {
  if (project.skills.length === 0) {
    return 100;
  }

  const talentSkillMap = buildTalentSkillMap(talent.skills);
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const ps of project.skills) {
    const weight = ps.isRequired ? 1.0 : 0.5;
    totalWeight += weight;

    const hasSkill =
      talentSkillMap.has(ps.skillId) ||
      talentSkillMap.has(ps.name.toLowerCase().trim());

    if (hasSkill) {
      earnedWeight += weight;
    }
  }

  if (totalWeight === 0) return 100;
  return (earnedWeight / totalWeight) * 100;
}

/**
 * Calculates level fit score (0-100).
 * For each project skill:
 * - talent level >= minLevel = 100
 * - 1 level below minLevel = 50
 * - >= 2 levels below minLevel = 0
 * - skill not possessed = 0
 * Returns weighted average (required skills weight 1.0, non-required 0.5).
 */
export function calculateLevelFitScore(
  talent: TalentContext | { skills: TalentSkill[] },
  project: ProjectContext | { skills: ProjectContext["skills"] }
): number {
  if (project.skills.length === 0) {
    return 100;
  }

  const talentSkillMap = buildTalentSkillMap(talent.skills);
  let totalWeight = 0;
  let weightedFitSum = 0;

  for (const ps of project.skills) {
    const weight = ps.isRequired ? 1.0 : 0.5;
    totalWeight += weight;

    const talentSkill =
      talentSkillMap.get(ps.skillId) ??
      talentSkillMap.get(ps.name.toLowerCase().trim());

    if (!talentSkill) {
      weightedFitSum += 0;
      continue;
    }

    const talentLevelNum = SKILL_LEVEL_NUMERIC[talentSkill.level];
    const projectMinLevelNum = SKILL_LEVEL_NUMERIC[ps.minLevel];

    let fit = 0;
    if (talentLevelNum >= projectMinLevelNum) {
      fit = 100;
    } else if (projectMinLevelNum - talentLevelNum === 1) {
      fit = 50;
    } else {
      fit = 0;
    }

    weightedFitSum += fit * weight;
  }

  if (totalWeight === 0) return 100;
  return weightedFitSum / totalWeight;
}

/**
 * Calculates availability score (0, 50, or 100).
 * - 100: isAvailable AND hours match (or either null) AND work mode matches
 *   (remote matches all; onsite/hybrid matches if talent has same preferredMode or null)
 * - 50: partially matches (e.g. hours match but mode doesn't, or vice-versa)
 * - 0: not available (!isAvailable) or neither matches
 */
export function calculateAvailabilityScore(
  talent: TalentContext,
  project: ProjectContext
): number {
  if (!talent.isAvailable) {
    return 0;
  }

  const hoursMatch =
    talent.hoursPerWeek === null ||
    project.hoursPerWeek === null ||
    talent.hoursPerWeek >= project.hoursPerWeek;

  const modeMatch =
    project.mode === "remote" ||
    talent.preferredMode === null ||
    talent.preferredMode === project.mode;

  if (hoursMatch && modeMatch) {
    return 100;
  }

  if (hoursMatch || modeMatch) {
    return 50;
  }

  return 0;
}

/**
 * Calculates rating score (0-100).
 * avgRating / 5 * 100.
 * If avgRating is null/undefined (no reviews yet), returns neutral cold-start value of 60.
 */
export function calculateRatingScore(avgRating: number | null | undefined): number {
  if (avgRating === null || avgRating === undefined) {
    return 60;
  }
  return Math.min(100, Math.max(0, (avgRating / 5) * 100));
}

/**
 * Generates an encouraging, constructive explanation in Indonesian.
 * Example: "Kamu memenuhi 3 dari 4 skill. Pelajari Power BI untuk meningkatkan kesiapanmu."
 */
function generateExplanation(
  totalSkills: number,
  matchedCount: number,
  missingSkills: string[],
  underLevelSkills: { name: string }[],
  finalScore: number
): string {
  if (totalSkills === 0) {
    return "Proyek ini terbuka untuk semua talenta tanpa syarat skill khusus.";
  }

  if (matchedCount === totalSkills) {
    return `Luar biasa! Kamu memenuhi semua ${totalSkills} skill yang dibutuhkan proyek ini.`;
  }

  if (missingSkills.length > 0) {
    return `Kamu memenuhi ${matchedCount} dari ${totalSkills} skill. Pelajari ${missingSkills[0]} untuk meningkatkan kesiapanmu.`;
  }

  if (underLevelSkills.length > 0) {
    return `Kamu memenuhi ${matchedCount} dari ${totalSkills} skill. Tingkatkan level ${underLevelSkills[0].name} untuk meningkatkan kesiapanmu.`;
  }

  return `Kecocokan profilmu dengan proyek ini adalah ${finalScore}%.`;
}

/**
 * Pure matchmaking calculation function according to PRD section 6.
 * match_score = 0.50 * skill + 0.20 * levelFit + 0.15 * availability + 0.15 * rating
 * Rounded to integer, clamped to 0-100.
 */
export function calculateMatch(
  talent: TalentContext,
  project: ProjectContext
): MatchResult {
  const skillScore = calculateSkillScore(talent, project);
  const levelFitScore = calculateLevelFitScore(talent, project);
  const availabilityScore = calculateAvailabilityScore(talent, project);
  const ratingScore = calculateRatingScore(talent.avgRating);

  const rawScore =
    WEIGHTS.skill * skillScore +
    WEIGHTS.levelFit * levelFitScore +
    WEIGHTS.availability * availabilityScore +
    WEIGHTS.rating * ratingScore;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  const skillGap = calculateSkillGap(talent, project);

  const explanation = generateExplanation(
    project.skills.length,
    skillGap.matchedSkills.length,
    skillGap.missingSkills,
    skillGap.underLevelSkills,
    finalScore
  );

  return {
    score: finalScore,
    breakdown: {
      skill: Math.round(skillScore),
      levelFit: Math.round(levelFitScore),
      availability: Math.round(availabilityScore),
      rating: Math.round(ratingScore),
    },
    matchedSkills: skillGap.matchedSkills,
    missingSkills: skillGap.missingSkills,
    underLevelSkills: skillGap.underLevelSkills,
    explanation,
  };
}

// Backward-compatibility alias
export const calculateMatchScore = calculateMatch;
