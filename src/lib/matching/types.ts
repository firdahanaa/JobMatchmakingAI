import type { WorkMode } from "@/types/database";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export const SKILL_LEVEL_NUMERIC: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export interface TalentSkill {
  skillId: number;
  name: string;
  level: SkillLevel;
}

export interface ProjectSkill {
  skillId: number;
  name: string;
  minLevel: SkillLevel;
  isRequired: boolean;
}

export interface TalentContext {
  skills: TalentSkill[];
  hoursPerWeek: number | null;
  preferredMode: WorkMode | null;
  isAvailable: boolean;
  avgRating: number | null;
}

export interface ProjectContext {
  skills: ProjectSkill[];
  hoursPerWeek: number | null;
  mode: WorkMode;
}

export interface MatchScoreBreakdown {
  skill: number;
  levelFit: number;
  availability: number;
  rating: number;
}

export interface UnderLevelSkill {
  name: string;
  has: SkillLevel;
  needs: SkillLevel;
}

export interface MatchResult {
  score: number;
  breakdown: {
    skill: number;
    levelFit: number;
    availability: number;
    rating: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  underLevelSkills: {
    name: string;
    has: SkillLevel;
    needs: SkillLevel;
  }[];
  explanation: string;
}

export interface SkillGapResult {
  missingSkills: string[];
  underLevelSkills: {
    name: string;
    has: SkillLevel;
    needs: SkillLevel;
  }[];
  matchedSkills: string[];
  readinessPercent: number;
}

// Backward-compatibility aliases
export type TalentSkillItem = TalentSkill;
export type ProjectSkillRequirement = ProjectSkill;
export type TalentAvailability = Pick<TalentContext, "hoursPerWeek" | "preferredMode">;
export type ProjectAvailability = Pick<ProjectContext, "hoursPerWeek" | "mode">;
