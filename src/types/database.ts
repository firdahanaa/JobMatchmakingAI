export type UserRole = 'talent' | 'vendor';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ProjectType = 'freelance' | 'volunteer';
export type WorkMode = 'remote' | 'onsite' | 'hybrid';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'closed';
export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'submitted'
  | 'approved'
  | 'completed';

export type PaymentStatus = 'none' | 'not_requested' | 'awaiting_payment' | 'paid';

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
  payment_enabled: boolean;
  portfolio_required: boolean;
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
  payment_status: PaymentStatus;
  cv_path: string | null;
  portfolio_path: string | null;
  related_links: string[];
  submission_links: string[];
  revision_note: string | null;
  revision_notes: string | null;
  submission_url: string | null;
  submission_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  project?: Project;
  talent?: TalentProfile & { profile?: Profile };
}

export type PaymentRecordStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export interface Payment {
  id: string;
  application_id: string;
  amount: number;
  currency: string;
  provider: string | null;
  provider_order_id: string | null;
  provider_ref: string | null;
  redirect_url: string | null;
  status: PaymentRecordStatus;
  paid_at: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  application?: Application;
}

export interface Certificate {
  id: string;
  application_id: string;
  certificate_no: string;
  issued_at: string;
  application?: Application;
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

// ---------- CHAT & MESSAGING ----------

export type MessageKind = 'text' | 'system' | 'contact' | 'meeting';

export interface ContactMetadata {
  contact_type: 'whatsapp' | 'telegram' | 'email' | 'phone' | 'linkedin' | 'other';
  value: string;
  note?: string;
}

export interface MeetingMetadata {
  title: string;
  start_time: string;
  duration_minutes: number;
  platform: 'google_meet' | 'zoom' | 'teams' | 'other';
  meeting_url?: string;
  notes?: string;
}

export type MessageMetadata = ContactMetadata | MeetingMetadata | Record<string, unknown>;

export interface Conversation {
  id: string;
  application_id: string;
  talent_id: string;
  vendor_id: string;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
  application?: Application;
  talent?: TalentProfile & { profile?: Profile };
  vendor?: VendorProfile & { profile?: Profile };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: MessageKind;
  body: string;
  metadata: MessageMetadata;
  created_at: string;
  sender?: Profile;
}

export interface ConversationRead {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

export interface UnreadCount {
  conversation_id: string;
  unread_count: number;
}
