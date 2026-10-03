import type { SkillLevel, WorkMode } from '@/types/database';

export interface TalentSkillItem {
  skillId: number;
  skillName: string;
  level: SkillLevel;
}

export interface ProjectSkillRequirement {
  skillId: number;
  skillName: string;
  minLevel: SkillLevel;
  isRequired: boolean;
}

export interface TalentAvailability {
  hoursPerWeek: number | null;
  preferredMode: WorkMode | null;
}

export interface ProjectAvailability {
  hoursPerWeek: number | null;
  mode: WorkMode;
}

export interface MatchScoreBreakdown {
  skillScore: number;
  levelFitScore: number;
  availabilityScore: number;
  ratingScore: number;
  totalScore: number;
  explanation: string;
}

export type SkillGapStatus = 'missing' | 'needs_improvement';

export interface SkillGapItem {
  skillId: number;
  skillName: string;
  status: SkillGapStatus;
  currentLevel?: SkillLevel;
  requiredLevel: SkillLevel;
  message: string;
}

export interface SkillGapResult {
  gaps: SkillGapItem[];
  missingCount: number;
  needsImprovementCount: number;
  summary: string;
}
