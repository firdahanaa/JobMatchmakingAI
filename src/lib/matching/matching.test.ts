import { describe, it, expect } from 'vitest';
import {
  calculateSkillScore,
  calculateLevelFitScore,
  calculateAvailabilityScore,
  calculateRatingScore,
  calculateMatchScore,
  calculateSkillGap,
} from './index';
import type { TalentSkillItem, ProjectSkillRequirement } from './types';

describe('Matching Engine: calculateSkillScore', () => {
  it('returns 100 when project has no skills listed', () => {
    const score = calculateSkillScore([], []);
    expect(score).toBe(100);
  });

  it('returns 100 when talent has all required skills', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'intermediate' },
      { skillId: 2, skillName: 'TypeScript', level: 'intermediate' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'intermediate', isRequired: true },
      { skillId: 2, skillName: 'TypeScript', minLevel: 'beginner', isRequired: true },
    ];
    expect(calculateSkillScore(talentSkills, projectSkills)).toBe(100);
  });

  it('calculates half score when talent has 1 of 2 required skills', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'intermediate' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'intermediate', isRequired: true },
      { skillId: 2, skillName: 'TypeScript', minLevel: 'beginner', isRequired: true },
    ];
    expect(calculateSkillScore(talentSkills, projectSkills)).toBe(50);
  });

  it('gives optional skill half weight (0.5)', () => {
    // 1 required (weight 1.0) + 1 optional (weight 0.5) = total 1.5
    // Talent has only required skill -> earned 1.0 / 1.5 = 67%
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'beginner' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'beginner', isRequired: true },
      { skillId: 2, skillName: 'Figma', minLevel: 'beginner', isRequired: false },
    ];
    expect(calculateSkillScore(talentSkills, projectSkills)).toBe(67);
  });
});

describe('Matching Engine: calculateLevelFitScore', () => {
  it('returns 100 if talent meets or exceeds all required levels', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'advanced' },
      { skillId: 2, skillName: 'Node.js', level: 'intermediate' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'intermediate', isRequired: true },
      { skillId: 2, skillName: 'Node.js', minLevel: 'intermediate', isRequired: true },
    ];
    expect(calculateLevelFitScore(talentSkills, projectSkills)).toBe(100);
  });

  it('returns 50 if talent is 1 level below required minimum', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'beginner' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'intermediate', isRequired: true },
    ];
    expect(calculateLevelFitScore(talentSkills, projectSkills)).toBe(50);
  });

  it('returns 0 if talent is 2 levels below or missing the skill', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'beginner' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'advanced', isRequired: true },
    ];
    expect(calculateLevelFitScore(talentSkills, projectSkills)).toBe(0);
  });
});

describe('Matching Engine: calculateAvailabilityScore', () => {
  it('gives 100 for remote project and sufficient hours', () => {
    const score = calculateAvailabilityScore(
      { hoursPerWeek: 20, preferredMode: 'remote' },
      { hoursPerWeek: 15, mode: 'remote' }
    );
    expect(score).toBe(100);
  });

  it('gives partial score for hybrid project when talent prefers remote only', () => {
    const score = calculateAvailabilityScore(
      { hoursPerWeek: 20, preferredMode: 'remote' },
      { hoursPerWeek: 20, mode: 'hybrid' }
    );
    // Hours = 100, Mode = 50 -> average = 75
    expect(score).toBe(75);
  });

  it('gives 0 mode score when onsite project clashes with remote-only talent', () => {
    const score = calculateAvailabilityScore(
      { hoursPerWeek: 20, preferredMode: 'remote' },
      { hoursPerWeek: 20, mode: 'onsite' }
    );
    // Hours = 100, Mode = 0 -> average = 50
    expect(score).toBe(50);
  });
});

describe('Matching Engine: calculateRatingScore', () => {
  it('returns cold-start score of 60 for new talent with no reviews', () => {
    expect(calculateRatingScore(null)).toBe(60);
    expect(calculateRatingScore(undefined)).toBe(60);
    expect(calculateRatingScore(0)).toBe(60);
  });

  it('calculates proportional score for reviewed talent', () => {
    expect(calculateRatingScore(5)).toBe(100);
    expect(calculateRatingScore(4)).toBe(80);
    expect(calculateRatingScore(4.5)).toBe(90);
  });
});

describe('Matching Engine: calculateMatchScore', () => {
  it('calculates weighted composite score accurately', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'intermediate' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'intermediate', isRequired: true },
    ];

    // skillScore: 100 (50%) = 50
    // levelFitScore: 100 (20%) = 20
    // availabilityScore: 100 (15%) = 15
    // ratingScore (cold-start 60): 60 (15%) = 9
    // total = 50 + 20 + 15 + 9 = 94
    const result = calculateMatchScore({
      talentSkills,
      projectSkills,
      talentAvailability: { hoursPerWeek: 20, preferredMode: 'remote' },
      projectAvailability: { hoursPerWeek: 10, mode: 'remote' },
      avgRating: null,
    });

    expect(result.totalScore).toBe(94);
    expect(result.skillScore).toBe(100);
    expect(result.levelFitScore).toBe(100);
    expect(result.availabilityScore).toBe(100);
    expect(result.ratingScore).toBe(60);
    expect(result.explanation).toContain('Luar biasa');
  });
});

describe('Matching Engine: calculateSkillGap', () => {
  it('identifies missing skills and skills needing improvement constructively', () => {
    const talentSkills: TalentSkillItem[] = [
      { skillId: 1, skillName: 'React', level: 'beginner' },
    ];
    const projectSkills: ProjectSkillRequirement[] = [
      { skillId: 1, skillName: 'React', minLevel: 'intermediate', isRequired: true },
      { skillId: 2, skillName: 'Power BI', minLevel: 'beginner', isRequired: true },
      { skillId: 3, skillName: 'Figma', minLevel: 'beginner', isRequired: false },
    ];

    const result = calculateSkillGap(talentSkills, projectSkills);

    expect(result.gaps).toHaveLength(2);
    expect(result.needsImprovementCount).toBe(1);
    expect(result.missingCount).toBe(1);

    const improvement = result.gaps.find((g) => g.status === 'needs_improvement');
    expect(improvement?.skillName).toBe('React');

    const missing = result.gaps.find((g) => g.status === 'missing');
    expect(missing?.skillName).toBe('Power BI');

    expect(result.summary).toContain('1 skill baru');
    expect(result.summary).toContain('1 skill yang bisa kamu tingkatkan');
  });
});
