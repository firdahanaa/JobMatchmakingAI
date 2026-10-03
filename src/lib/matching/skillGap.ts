import type {
  TalentSkillItem,
  ProjectSkillRequirement,
  SkillGapItem,
  SkillGapResult,
} from './types';
import type { SkillLevel } from '@/types/database';

const LEVEL_NUMERIC: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Pemula (Beginner)',
  intermediate: 'Menengah (Intermediate)',
  advanced: 'Mahir (Advanced)',
};

/**
 * Calculates skill gap between talent's skills and project's required skills.
 * Identifies missing skills and skills where level is below required minimum.
 * Language is constructive and encouraging as required by PRD UX notes.
 */
export function calculateSkillGap(
  talentSkills: TalentSkillItem[],
  projectSkills: ProjectSkillRequirement[]
): SkillGapResult {
  const talentSkillMap = new Map<string, TalentSkillItem>();
  for (const ts of talentSkills) {
    talentSkillMap.set(ts.skillId.toString(), ts);
    talentSkillMap.set(ts.skillName.toLowerCase().trim(), ts);
  }

  const gaps: SkillGapItem[] = [];

  for (const ps of projectSkills) {
    // Only examine required skills for skill gap (optional skills are bonus)
    if (!ps.isRequired) continue;

    const talentSkill =
      talentSkillMap.get(ps.skillId.toString()) ??
      talentSkillMap.get(ps.skillName.toLowerCase().trim());

    if (!talentSkill) {
      gaps.push({
        skillId: ps.skillId,
        skillName: ps.skillName,
        status: 'missing',
        requiredLevel: ps.minLevel,
        message: `Pelajari dasar ${ps.skillName} (minimal level ${LEVEL_LABELS[ps.minLevel]}) untuk meningkatkan peluangmu.`,
      });
    } else {
      const talentNum = LEVEL_NUMERIC[talentSkill.level];
      const requiredNum = LEVEL_NUMERIC[ps.minLevel];

      if (talentNum < requiredNum) {
        gaps.push({
          skillId: ps.skillId,
          skillName: ps.skillName,
          status: 'needs_improvement',
          currentLevel: talentSkill.level,
          requiredLevel: ps.minLevel,
          message: `Tingkatkan kemampuan ${ps.skillName} dari ${LEVEL_LABELS[talentSkill.level]} ke ${LEVEL_LABELS[ps.minLevel]}.`,
        });
      }
    }
  }

  const missingCount = gaps.filter((g) => g.status === 'missing').length;
  const needsImprovementCount = gaps.filter((g) => g.status === 'needs_improvement').length;

  let summary = '';
  if (gaps.length === 0) {
    summary = 'Profilmu sangat cocok dengan seluruh skill utama yang dibutuhkan pada proyek ini!';
  } else {
    const parts: string[] = [];
    if (missingCount > 0) {
      parts.push(`${missingCount} skill baru yang bisa kamu pelajari`);
    }
    if (needsImprovementCount > 0) {
      parts.push(`${needsImprovementCount} skill yang bisa kamu tingkatkan`);
    }
    summary = `Terdapat ${parts.join(' dan ')} untuk memenuhi kriteria proyek ini secara optimal.`;
  }

  return {
    gaps,
    missingCount,
    needsImprovementCount,
    summary,
  };
}
