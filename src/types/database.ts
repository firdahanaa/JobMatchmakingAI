export type UserRole = 'talent' | 'vendor';
export type PlatformRole = 'user' | 'platform_admin';
export type CompanyRole = 'company_owner' | 'hr_admin' | 'hr_recruiter';
export type CompanyMemberStatus = 'active' | 'disabled';
export type CompanyStatus = 'active' | 'deactivated' | 'archived';
export type CompanyInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type BusinessRole =
  | 'talent'
  | 'company_owner'
  | 'hr_admin'
  | 'hr_recruiter'
  | 'platform_admin';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ProjectType = 'freelance' | 'volunteer';
export type WorkMode = 'remote' | 'onsite' | 'hybrid';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'withdrawn';

export type ScreeningStatus =
  | 'not_started'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'needs_review';

export interface Profile {
  id: string;
  role: UserRole;
  platform_role?: PlatformRole;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  legacy_vendor_user_id: string;
  name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  status: CompanyStatus;
  deactivated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  status: CompanyMemberStatus;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>;
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: Extract<CompanyRole, 'hr_admin' | 'hr_recruiter'>;
  token_hash: string;
  status: CompanyInvitationStatus;
  invited_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface TalentProfile {
  user_id: string;
  headline: string | null;
  bio: string | null;
  education: string | null;
  education_history: EducationHistoryItem[];
  work_experience: WorkExperienceItem[];
  location: string | null;
  hours_per_week: number | null;
  preferred_mode: WorkMode | null;
  is_available: boolean;
  portfolio_urls: string[];
  current_cv_id: string | null;
  updated_at: string;
}

export interface EducationHistoryItem {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
}

export interface WorkExperienceItem {
  company: string;
  role: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export type CvProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'needs_ocr'
  | 'failed';

export interface CandidateCv {
  id: string;
  candidate_id: string;
  original_filename: string;
  file_size_bytes: number;
  processing_status: CvProcessingStatus;
  processing_error: string | null;
  uploaded_at: string;
  processed_at: string | null;
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
  company_id?: string;
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
  candidate_cv_id: string | null;
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
