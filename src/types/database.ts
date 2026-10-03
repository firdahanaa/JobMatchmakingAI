export type UserRole = 'talent' | 'vendor';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ProjectType = 'freelance' | 'volunteer';
export type WorkMode = 'remote' | 'onsite' | 'hybrid';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'withdrawn';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TalentProfile {
  user_id: string;
  headline: string | null;
  bio: string | null;
  education: string | null;
  location: string | null;
  hours_per_week: number | null;
  preferred_mode: WorkMode | null;
  is_available: boolean;
  portfolio_urls: string[];
  updated_at: string;
}

export interface VendorProfile {
  user_id: string;
  organization_name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  updated_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface TalentSkill {
  talent_id: string;
  skill_id: number;
  level: SkillLevel;
  skill?: Skill;
}

export interface Project {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  type: ProjectType;
  mode: WorkMode;
  duration_weeks: number | null;
  hours_per_week: number | null;
  reward_amount: number | null;
  reward_note: string | null;
  deadline: string | null;
  status: ProjectStatus;
  created_at: string;
  vendor?: VendorProfile;
}

export interface ProjectSkill {
  project_id: string;
  skill_id: number;
  min_level: SkillLevel;
  is_required: boolean;
  skill?: Skill;
}

export interface Application {
  id: string;
  project_id: string;
  talent_id: string;
  message: string | null;
  match_score: number | null;
  status: ApplicationStatus;
  created_at: string;
  project?: Project;
  talent?: TalentProfile & { profile?: Profile };
}

export interface Review {
  id: string;
  application_id: string;
  vendor_id: string;
  talent_id: string;
  rating: number;
  quality: number | null;
  timeliness: number | null;
  communication: number | null;
  comment: string | null;
  created_at: string;
}

export interface TalentRatingView {
  talent_id: string;
  avg_rating: number;
  review_count: number;
}
