import type {
  TalentSkillItem,
  ProjectSkillRequirement,
  TalentAvailability,
  ProjectAvailability,
  MatchScoreBreakdown,
} from './types';
import type { SkillLevel } from '@/types/database';

const LEVEL_NUMERIC: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Calculates skill match score (0-100).
 * Required skills have weight 1.0, optional skills have weight 0.5.
 */
export function calculateSkillScore(
  talentSkills: TalentSkillItem[],
  projectSkills: ProjectSkillRequirement[]
): number {
  if (projectSkills.length === 0) {
    return 100;
  }

  const talentSkillMap = new Map<string, TalentSkillItem>();
  for (const ts of talentSkills) {
    talentSkillMap.set(ts.skillId.toString(), ts);
    talentSkillMap.set(ts.skillName.toLowerCase().trim(), ts);
  }

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const ps of projectSkills) {
    const weight = ps.isRequired ? 1.0 : 0.5;
    totalWeight += weight;

    const matched =
      talentSkillMap.has(ps.skillId.toString()) ||
      talentSkillMap.has(ps.skillName.toLowerCase().trim());

    if (matched) {
      earnedWeight += weight;
    }
  }

  if (totalWeight === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((earnedWeight / totalWeight) * 100)));
}

/**
 * Compares talent skill level with project minimum level for required skills.
 * Level >= minimum = 100; 1 level lower = 50; >= 2 levels lower or missing = 0.
 */
export function calculateLevelFitScore(
  talentSkills: TalentSkillItem[],
  projectSkills: ProjectSkillRequirement[]
): number {
  const requiredSkills = projectSkills.filter((ps) => ps.isRequired);
  if (requiredSkills.length === 0) {
    return 100;
  }

  const talentSkillMap = new Map<string, SkillLevel>();
  for (const ts of talentSkills) {
    talentSkillMap.set(ts.skillId.toString(), ts.level);
    talentSkillMap.set(ts.skillName.toLowerCase().trim(), ts.level);
  }

  let totalFit = 0;

  for (const ps of requiredSkills) {
    const talentLevel =
      talentSkillMap.get(ps.skillId.toString()) ??
      talentSkillMap.get(ps.skillName.toLowerCase().trim());

    if (!talentLevel) {
      // Talent does not have this required skill
      totalFit += 0;
      continue;
    }

    const talentNum = LEVEL_NUMERIC[talentLevel];
    const requiredNum = LEVEL_NUMERIC[ps.minLevel];

    if (talentNum >= requiredNum) {
      totalFit += 100;
    } else if (requiredNum - talentNum === 1) {
      totalFit += 50;
    } else {
      totalFit += 0;
    }
  }

  return Math.min(100, Math.max(0, Math.round(totalFit / requiredSkills.length)));
}

/**
 * Calculates availability score based on hours and work mode.
 * Matching = 100, Partial = 50, No match = 0.
 */
export function calculateAvailabilityScore(
  talent: TalentAvailability,
  project: ProjectAvailability
): number {
  // Hours score
  let hoursScore = 100;
  if (project.hoursPerWeek !== null && project.hoursPerWeek > 0) {
    if (talent.hoursPerWeek === null || talent.hoursPerWeek === undefined) {
      hoursScore = 50;
    } else if (talent.hoursPerWeek >= project.hoursPerWeek) {
      hoursScore = 100;
    } else if (talent.hoursPerWeek >= project.hoursPerWeek * 0.5) {
      hoursScore = 50;
    } else {
      hoursScore = 0;
    }
  }

  // Mode score
  let modeScore = 100;
  if (project.mode === 'remote') {
    modeScore = 100;
  } else if (!talent.preferredMode) {
    modeScore = 100; // Talent is flexible
  } else if (talent.preferredMode === project.mode) {
    modeScore = 100;
  } else if (talent.preferredMode === 'hybrid') {
    // Hybrid talent can do onsite or remote
    modeScore = 100;
  } else if (project.mode === 'hybrid') {
    // Project is hybrid, but talent prefers purely onsite or remote
    modeScore = 50;
  } else {
    // Complete mismatch (e.g. onsite project vs remote only talent)
    modeScore = 0;
  }

  return Math.round((hoursScore + modeScore) / 2);
}

/**
 * Calculates rating score from average rating.
 * Cold-start neutral score is 60 for talents with no reviews.
 */
export function calculateRatingScore(avgRating: number | null | undefined): number {
  if (avgRating === null || avgRating === undefined || avgRating === 0) {
    return 60;
  }
  return Math.min(100, Math.max(0, Math.round((avgRating / 5) * 100)));
}

/**
 * Calculates the overall match score (0-100) and breakdown according to PRD MVP v1 formula:
 * match_score = 0.50 * skill_score + 0.20 * level_fit_score + 0.15 * availability_score + 0.15 * rating_score
 */
export function calculateMatchScore(params: {
  talentSkills: TalentSkillItem[];
  projectSkills: ProjectSkillRequirement[];
  talentAvailability: TalentAvailability;
  projectAvailability: ProjectAvailability;
  avgRating?: number | null;
}): MatchScoreBreakdown {
  const skillScore = calculateSkillScore(params.talentSkills, params.projectSkills);
  const levelFitScore = calculateLevelFitScore(params.talentSkills, params.projectSkills);
  const availabilityScore = calculateAvailabilityScore(
    params.talentAvailability,
    params.projectAvailability
  );
  const ratingScore = calculateRatingScore(params.avgRating);

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        0.5 * skillScore +
          0.2 * levelFitScore +
          0.15 * availabilityScore +
          0.15 * ratingScore
      )
    )
  );

  // Generate clear, constructive explanation in Indonesian
  const requiredSkills = params.projectSkills.filter((ps) => ps.isRequired);
  const talentSkillSet = new Set(
    params.talentSkills.map((ts) => ts.skillName.toLowerCase().trim())
  );
  const matchedRequired = requiredSkills.filter((ps) =>
    talentSkillSet.has(ps.skillName.toLowerCase().trim())
  );
  const missingRequired = requiredSkills.filter(
    (ps) => !talentSkillSet.has(ps.skillName.toLowerCase().trim())
  );

  let explanation = '';
  if (requiredSkills.length === 0) {
    explanation = 'Proyek ini terbuka untuk semua skill dasar.';
  } else if (matchedRequired.length === requiredSkills.length) {
    explanation = `Luar biasa! Kamu memenuhi semua ${requiredSkills.length} skill utama yang dibutuhkan.`;
  } else if (missingRequired.length > 0) {
    const missingNames = missingRequired.map((s) => s.skillName).join(', ');
    explanation = `Kamu memenuhi ${matchedRequired.length} dari ${requiredSkills.length} skill utama. Skill yang belum ada: ${missingNames}.`;
  } else {
    explanation = `Kecocokan profil kamu dengan kebutuhan proyek ini adalah ${totalScore}%.`;
  }

  return {
    skillScore,
    levelFitScore,
    availabilityScore,
    ratingScore,
    totalScore,
    explanation,
  };
}
