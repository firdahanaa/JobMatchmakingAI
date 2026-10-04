import {
  SKILL_LEVEL_NUMERIC,
  type SkillLevel,
  type TalentContext,
  type ProjectContext,
  type SkillGapResult,
  type TalentSkill,
  type ProjectSkill,
} from "./types";

/**
 * Calculates skill gap between a talent and project requirements.
 * - missingSkills: skills required by project that talent does not possess
 * - underLevelSkills: skills talent possesses but below project minLevel
 * - matchedSkills: skills talent possesses with level >= minLevel
 * - readinessPercent: percentage of readiness (0-100) based on matched skills
 */
export function calculateSkillGap(
  talent: TalentContext | { skills: TalentSkill[] },
  project: ProjectContext | { skills: ProjectSkill[] }
): SkillGapResult {
  const missingSkills: string[] = [];
  const underLevelSkills: { name: string; has: SkillLevel; needs: SkillLevel }[] = [];
  const matchedSkills: string[] = [];

  const talentSkillMap = new Map<number | string, TalentSkill>();
  for (const ts of talent.skills) {
    talentSkillMap.set(ts.skillId, ts);
    talentSkillMap.set(ts.name.toLowerCase().trim(), ts);
  }

  for (const ps of project.skills) {
    const talentSkill =
      talentSkillMap.get(ps.skillId) ??
      talentSkillMap.get(ps.name.toLowerCase().trim());

    if (!talentSkill) {
      missingSkills.push(ps.name);
    } else {
      const talentNum = SKILL_LEVEL_NUMERIC[talentSkill.level];
      const projectNum = SKILL_LEVEL_NUMERIC[ps.minLevel];

      if (talentNum >= projectNum) {
        matchedSkills.push(ps.name);
      } else {
        underLevelSkills.push({
          name: ps.name,
          has: talentSkill.level,
          needs: ps.minLevel,
        });
      }
    }
  }

  const totalSkills = project.skills.length;
  const readinessPercent =
    totalSkills === 0
      ? 100
      : Math.min(100, Math.max(0, Math.round((matchedSkills.length / totalSkills) * 100)));

  return {
    missingSkills,
    underLevelSkills,
    matchedSkills,
    readinessPercent,
  };
}
