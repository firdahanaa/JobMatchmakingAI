import {
  buildOpportunityEmbeddingDocument,
  buildTalentEmbeddingDocument,
} from "./embedding";
import {
  extractTalentNormalizedSkills,
  normalizeAndDeduplicateSkills,
} from "./skill-normalizer";
import {
  DEFAULT_WEIGHT_CONFIG,
  type NormalizedSkillEntry,
  type OpportunityMatchInput,
  type RankingPipelineResult,
  type RuleBasedExclusion,
  type SkillGapAnalysis,
  type TalentMatchProfileInput,
  type TalentRecommendationScore,
  type TextEmbedder,
  type WeightConfig,
} from "./types";

const ACTIVE_OPPORTUNITY_STATUSES = new Set(["open"]);

function roundScore(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Menghitung Cosine Similarity antara dua vektor embedding A dan B:
 * CosineSimilarity(A, B) = (A · B) / (||A|| × ||B||)
 */
export function calculateVectorCosineSimilarity(
  vectorA: readonly number[],
  vectorB: readonly number[]
): number {
  if (vectorA.length === 0 || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normASquared = 0;
  let normBSquared = 0;

  for (let i = 0; i < vectorA.length; i += 1) {
    const a = vectorA[i];
    const b = vectorB[i];
    dotProduct += a * b;
    normASquared += a * a;
    normBSquared += b * b;
  }

  const denominator = Math.sqrt(normASquared) * Math.sqrt(normBSquared);
  if (denominator === 0) return 0;

  const raw = dotProduct / denominator;
  if (raw >= 1 - Number.EPSILON * 8) return 1;
  if (raw <= -1 + Number.EPSILON * 8) return -1;
  return Math.min(1, Math.max(-1, raw));
}

/**
 * Mengonversi nilai Cosine Similarity menjadi Semantic Similarity Score (0–100)
 * sesuai persamaan pada Bab 3.5 Skripsi:
 * SS = max(0, CosineSimilarity(A, B)) × 100
 */
export function calculateSemanticSimilarityScore(cosineSimilarity: number): number {
  const clamped = Math.max(0, Math.min(1, cosineSimilarity));
  return roundScore(clamped * 100, 2);
}

/**
 * Menghitung Skill Matching Score (SM) dan analisis Skill Gap secara Rule-Based.
 *
 * Sesuai Bab 3.5 Skripsi:
 * - Setiap keterampilan yang dipersyaratkan memiliki bobot kepentingan yang sama.
 * - Pencocokan dilakukan terhadap istilah keterampilan yang sudah dinormalisasi & dideduplikasi.
 * - Jika peluang tidak memiliki daftar keterampilan yang dipersyaratkan, mengembalikan null
 *   (nilai Skill Matching tidak dihitung).
 * - Keterampilan yang belum ditemukan dicatat sebagai "belum teridentifikasi" (unidentifiedSkills).
 */
export function calculateSkillMatching(
  talentSkills: readonly NormalizedSkillEntry[],
  opportunityRequiredSkills: readonly string[]
): { skillMatchingScore: number; skillGap: SkillGapAnalysis } | null {
  const normalizedRequired = normalizeAndDeduplicateSkills(opportunityRequiredSkills);
  if (normalizedRequired.length === 0) {
    return null;
  }

  const talentKeySet = new Set(talentSkills.map((skill) => skill.key));
  const matchedSkills: string[] = [];
  const unidentifiedSkills: string[] = [];

  for (const required of normalizedRequired) {
    if (talentKeySet.has(required.key)) {
      matchedSkills.push(required.label);
    } else {
      unidentifiedSkills.push(required.label);
    }
  }

  const skillMatchingScore = roundScore(
    (matchedSkills.length / normalizedRequired.length) * 100,
    2
  );

  return {
    skillMatchingScore,
    skillGap: {
      matchedSkills,
      unidentifiedSkills,
      totalRequiredSkills: normalizedRequired.length,
    },
  };
}

/**
 * Memvalidasi konfigurasi bobot Weighted Scoring (w1 + w2 = 1).
 */
export function validateWeightConfig(weights: WeightConfig): void {
  const { semanticSimilarity: w1, skillMatching: w2 } = weights;
  if (
    !Number.isFinite(w1) ||
    !Number.isFinite(w2) ||
    w1 < 0 ||
    w2 < 0 ||
    Math.abs(w1 + w2 - 1) > 1e-6
  ) {
    throw new Error(
      `Konfigurasi bobot tidak valid: w1 (${w1}) + w2 (${w2}) harus sama dengan 1.`
    );
  }
}

/**
 * Menghitung skor akhir rekomendasi dengan metode Weighted Scoring (Bab 3.5 Skripsi):
 * WS = (w1 × SS) + (w2 × SM)
 */
export function calculateWeightedScore(
  semanticSimilarityScore: number,
  skillMatchingScore: number,
  weights: WeightConfig = DEFAULT_WEIGHT_CONFIG
): number {
  validateWeightConfig(weights);
  const raw =
    weights.semanticSimilarity * semanticSimilarityScore +
    weights.skillMatching * skillMatchingScore;
  return roundScore(Math.min(100, Math.max(0, raw)), 2);
}

/**
 * Menjalankan pipeline rekomendasi lengkap sisi Talent:
 * 1. Rule-Based normalisasi keterampilan Talent (profil + CV).
 * 2. Rule-Based validasi kelengkapan profil Talent dan filter peluang aktif + memiliki skill.
 * 3. Text Embedding (Multilingual E5-Small) + Cosine Similarity (SS).
 * 4. Skill Matching (SM) + analisis Skill Gap.
 * 5. Weighted Scoring (WS) dan pengurutan peringkat tertinggi ke terendah.
 */
export async function rankOpportunitiesForTalent(
  talent: TalentMatchProfileInput,
  opportunities: readonly OpportunityMatchInput[],
  embedder: TextEmbedder,
  weights: WeightConfig = DEFAULT_WEIGHT_CONFIG
): Promise<RankingPipelineResult> {
  validateWeightConfig(weights);

  const talentNormalizedSkills = extractTalentNormalizedSkills(talent);
  const talentDocument = buildTalentEmbeddingDocument(
    talent,
    talentNormalizedSkills.map((s) => s.label)
  );

  const excluded: RuleBasedExclusion[] = [];

  if (!talentDocument) {
    for (const opportunity of opportunities) {
      excluded.push({
        opportunityId: opportunity.id,
        reason: "incomplete_talent_profile",
      });
    }
    return {
      recommendations: [],
      excluded,
      talentNormalizedSkills,
      talentDocument,
    };
  }

  // Rule-Based filtering sebelum memanggil model embedding
  interface EligibleOpportunity {
    opportunity: OpportunityMatchInput;
    skillMatchingScore: number;
    skillGap: SkillGapAnalysis;
    document: string;
  }

  const eligible: EligibleOpportunity[] = [];

  for (const opportunity of opportunities) {
    const normalizedStatus = opportunity.status.trim().toLowerCase();
    if (!ACTIVE_OPPORTUNITY_STATUSES.has(normalizedStatus)) {
      excluded.push({
        opportunityId: opportunity.id,
        reason: "inactive_status",
      });
      continue;
    }

    if (!opportunity.title?.trim() || !opportunity.description?.trim()) {
      excluded.push({
        opportunityId: opportunity.id,
        reason: "incomplete_opportunity_text",
      });
      continue;
    }

    // Rule-Based: peluang tanpa persyaratan keterampilan tidak dihitung SM & tidak memperoleh skor akhir
    const skillResult = calculateSkillMatching(
      talentNormalizedSkills,
      opportunity.requiredSkills
    );
    if (!skillResult) {
      excluded.push({
        opportunityId: opportunity.id,
        reason: "missing_required_skills",
      });
      continue;
    }

    const normalizedOpportunitySkills = normalizeAndDeduplicateSkills(
      opportunity.requiredSkills
    );
    const document = buildOpportunityEmbeddingDocument(
      opportunity,
      normalizedOpportunitySkills.map((s) => s.label)
    );

    eligible.push({
      opportunity,
      skillMatchingScore: skillResult.skillMatchingScore,
      skillGap: skillResult.skillGap,
      document,
    });
  }

  if (eligible.length === 0) {
    return {
      recommendations: [],
      excluded,
      talentNormalizedSkills,
      talentDocument,
    };
  }

  const talentVector = await embedder.embedQuery(talentDocument);
  const recommendations: TalentRecommendationScore[] = [];

  for (const item of eligible) {
    const opportunityVector = await embedder.embedPassage(item.document);
    const cosineSimilarity = calculateVectorCosineSimilarity(
      talentVector,
      opportunityVector
    );
    const semanticSimilarityScore =
      calculateSemanticSimilarityScore(cosineSimilarity);
    const weightedScore = calculateWeightedScore(
      semanticSimilarityScore,
      item.skillMatchingScore,
      weights
    );

    recommendations.push({
      opportunityId: item.opportunity.id,
      cosineSimilarity,
      semanticSimilarityScore,
      skillMatchingScore: item.skillMatchingScore,
      weightedScore,
      weightsUsed: weights,
      skillGap: item.skillGap,
    });
  }

  recommendations.sort((left, right) => {
    if (right.weightedScore !== left.weightedScore) {
      return right.weightedScore - left.weightedScore;
    }
    if (right.skillMatchingScore !== left.skillMatchingScore) {
      return right.skillMatchingScore - left.skillMatchingScore;
    }
    return right.semanticSimilarityScore - left.semanticSimilarityScore;
  });

  return {
    recommendations,
    excluded,
    talentNormalizedSkills,
    talentDocument,
  };
}
