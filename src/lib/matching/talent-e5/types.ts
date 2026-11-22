/**
 * Tipe data utama untuk sistem rekomendasi Pathfolio sisi Talent
 * berbasis Multilingual E5-Small, Cosine Similarity, Skill Matching,
 * Weighted Scoring, dan Rule-Based System (sesuai Bab 3 Skripsi).
 */

export interface WeightConfig {
  /** Bobot Semantic Similarity (w1), rentang 0..1 */
  semanticSimilarity: number;
  /** Bobot Skill Matching (w2), rentang 0..1 */
  skillMatching: number;
  /** Label skenario pengujian, misal "50:50" */
  label?: string;
}

/**
 * 5 kombinasi bobot pengujian sesuai Tabel 3.4 Skripsi (Bab 3.5).
 */
export const THESIS_WEIGHT_SCENARIOS: readonly WeightConfig[] = [
  { semanticSimilarity: 0.3, skillMatching: 0.7, label: "30:70" },
  { semanticSimilarity: 0.4, skillMatching: 0.6, label: "40:60" },
  { semanticSimilarity: 0.5, skillMatching: 0.5, label: "50:50" },
  { semanticSimilarity: 0.6, skillMatching: 0.4, label: "60:40" },
  { semanticSimilarity: 0.7, skillMatching: 0.3, label: "70:30" },
] as const;

/** Bobot default awal sesuai Bab 3.5 (50% Semantic Similarity, 50% Skill Matching). */
export const DEFAULT_WEIGHT_CONFIG: WeightConfig = THESIS_WEIGHT_SCENARIOS[2];

export interface TalentEducationItem {
  institution?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TalentWorkExperienceItem {
  company?: string | null;
  role?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
}

export interface TalentMatchProfileInput {
  headline?: string | null;
  bio?: string | null;
  education?: string | null;
  educationHistory?: readonly TalentEducationItem[] | null;
  workExperience?: readonly TalentWorkExperienceItem[] | null;
  /** Daftar skill yang diisi Talent pada profil */
  profileSkills?: readonly string[] | null;
  /** Teks mentah hasil ekstraksi CV (dari tabel candidate_cv_extractions) */
  cvExtractedText?: string | null;
  /** Daftar skill terstruktur hasil ekstraksi CV (structured_data.skills) */
  cvStructuredSkills?: readonly string[] | null;
}

export interface OpportunityMatchInput {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  /** Status peluang (Rule-Based: hanya status aktif seperti 'open' yang diproses) */
  status: string;
  /** Daftar keterampilan yang dipersyaratkan oleh peluang */
  requiredSkills: readonly string[];
}

export interface NormalizedSkillEntry {
  /** Kunci kanonis huruf kecil untuk pencocokan pasti (mis. "javascript", "ui/ux design") */
  key: string;
  /** Label tampilan yang rapi (mis. "JavaScript", "UI/UX Design") */
  label: string;
}

export interface SkillGapAnalysis {
  /** Keterampilan peluang yang teridentifikasi pada profil/CV Talent */
  matchedSkills: string[];
  /**
   * Keterampilan peluang yang belum teridentifikasi pada profil/CV Talent.
   * Sesuai Bab 1.3: bukan bukti bahwa Talent tidak memiliki kemampuan tersebut,
   * melainkan belum tercantum/teridentifikasi pada profil atau CV.
   */
  unidentifiedSkills: string[];
  /** Total keterampilan unik yang dipersyaratkan peluang setelah normalisasi */
  totalRequiredSkills: number;
}

export interface TalentRecommendationScore {
  opportunityId: string;
  /** Nilai Cosine Similarity mentah dalam rentang [-1, 1] */
  cosineSimilarity: number;
  /** Semantic Similarity Score: SS = max(0, CosineSimilarity(A, B)) × 100 (0..100) */
  semanticSimilarityScore: number;
  /** Skill Matching Score: SM = (jumlah skill cocok / total skill peluang) × 100 (0..100) */
  skillMatchingScore: number;
  /** Weighted Score: WS = (w1 × SS) + (w2 × SM) (0..100) */
  weightedScore: number;
  weightsUsed: WeightConfig;
  skillGap: SkillGapAnalysis;
}

export type RuleBasedExclusionReason =
  | "inactive_status"
  | "incomplete_opportunity_text"
  | "missing_required_skills"
  | "incomplete_talent_profile";

export interface RuleBasedExclusion {
  opportunityId: string;
  reason: RuleBasedExclusionReason;
}

export interface RankingPipelineResult {
  recommendations: TalentRecommendationScore[];
  excluded: RuleBasedExclusion[];
  talentNormalizedSkills: NormalizedSkillEntry[];
  talentDocument: string;
}

/**
 * Kontrak abstrak untuk penyedia embedding agar mudah diuji (unit test)
 * maupun diganti modelnya tanpa mengubah logika skor.
 */
export interface TextEmbedder {
  embedQuery(text: string): Promise<number[]>;
  embedPassage(text: string): Promise<number[]>;
}
