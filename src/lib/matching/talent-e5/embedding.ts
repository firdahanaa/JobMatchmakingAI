import { createHash } from "node:crypto";
import path from "node:path";
import type {
  OpportunityMatchInput,
  TalentMatchProfileInput,
  TextEmbedder,
} from "./types";

/**
 * Model default: Xenova/multilingual-e5-small (konversi ONNX resmi dari
 * intfloat/multilingual-e5-small, 384 dimensi, mendukung Bahasa Indonesia & Inggris).
 */
export const DEFAULT_E5_MODEL_ID =
  process.env.TALENT_E5_MODEL_ID || "Xenova/multilingual-e5-small";

/**
 * Batas kata per potongan (chunk) untuk teks panjang seperti CV 1-2 halaman.
 * 250 kata umumnya setara ~350-430 subword token SentencePiece sehingga aman
 * di bawah batas konteks 512 token milik multilingual-e5-small.
 */
const DEFAULT_MAX_CHUNK_WORDS = 250;
const DEFAULT_CHUNK_OVERLAP_WORDS = 40;
const MAX_VECTOR_CACHE_ENTRIES = 500;

type FeatureExtractionOutput = {
  data: Float32Array | number[];
};

type FeatureExtractionPipeline = (
  input: string,
  options?: { pooling?: "mean" | "cls" | "none"; normalize?: boolean }
) => Promise<FeatureExtractionOutput>;

interface GlobalE5State {
  pipelines: Map<string, Promise<FeatureExtractionPipeline>>;
  vectorCache: Map<string, number[]>;
}

const globalForE5 = globalThis as typeof globalThis & {
  __pathfolioTalentE5State?: GlobalE5State;
};

function getGlobalE5State(): GlobalE5State {
  if (!globalForE5.__pathfolioTalentE5State) {
    globalForE5.__pathfolioTalentE5State = {
      pipelines: new Map(),
      vectorCache: new Map(),
    };
  }
  return globalForE5.__pathfolioTalentE5State;
}

export function cleanTextForEmbedding(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Model keluarga E5 mewajibkan prefix "query: " untuk teks pencarian (profil/CV Talent)
 * dan "passage: " untuk dokumen kandidat (deskripsi pekerjaan/proyek).
 */
export function formatE5Query(text: string): string {
  const cleaned = cleanTextForEmbedding(text);
  if (!cleaned) return "";
  return /^query:\s*/i.test(cleaned) ? cleaned : `query: ${cleaned}`;
}

export function formatE5Passage(text: string): string {
  const cleaned = cleanTextForEmbedding(text);
  if (!cleaned) return "";
  return /^passage:\s*/i.test(cleaned) ? cleaned : `passage: ${cleaned}`;
}

/**
 * Memecah teks panjang (misalnya CV ATS lengkap) menjadi beberapa chunk tumpang-tindih
 * agar seluruh informasi penting tetap terepresentasi tanpa terpotong batas 512 token.
 */
export function splitTextIntoChunks(
  text: string,
  maxWords = DEFAULT_MAX_CHUNK_WORDS,
  overlapWords = DEFAULT_CHUNK_OVERLAP_WORDS
): string[] {
  const cleaned = cleanTextForEmbedding(text);
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) {
    return [cleaned];
  }

  const safeOverlap = Math.min(overlapWords, Math.floor(maxWords / 3));
  const step = Math.max(1, maxWords - safeOverlap);
  const chunks: string[] = [];

  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + maxWords);
    if (slice.length > 0) {
      chunks.push(slice.join(" "));
    }
    if (start + maxWords >= words.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Merata-ratakan beberapa vektor chunk lalu melakukan normalisasi L2.
 */
export function averageAndNormalizeVectors(vectors: readonly (readonly number[])[]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  if (dim === 0) return [];

  const sum = new Array<number>(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i += 1) {
      sum[i] += vec[i] ?? 0;
    }
  }

  let normSquared = 0;
  for (let i = 0; i < dim; i += 1) {
    sum[i] /= vectors.length;
    normSquared += sum[i] * sum[i];
  }

  const norm = Math.sqrt(normSquared);
  if (norm === 0) return sum;
  return sum.map((val) => val / norm);
}

/**
 * Menyusun dokumen teks representatif Talent (profil + keterampilan + riwayat + isi CV)
 * dengan prioritas informasi kunci di awal agar tetap optimal pada representasi semantik.
 */
export function buildTalentEmbeddingDocument(
  talent: TalentMatchProfileInput,
  normalizedSkillLabels: readonly string[] = []
): string {
  const sections: string[] = [];

  if (talent.headline?.trim()) {
    sections.push(`Headline: ${talent.headline.trim()}`);
  }

  if (normalizedSkillLabels.length > 0) {
    sections.push(`Keterampilan: ${normalizedSkillLabels.join(", ")}`);
  }

  if (talent.bio?.trim()) {
    sections.push(`Ringkasan: ${talent.bio.trim()}`);
  }

  const workLines = (talent.workExperience ?? [])
    .map((item) => {
      const titlePart = [item.role?.trim(), item.company?.trim()]
        .filter(Boolean)
        .join(" di ");
      const descPart = item.description?.trim();
      return [titlePart, descPart].filter(Boolean).join(" - ");
    })
    .filter(Boolean);

  if (workLines.length > 0) {
    sections.push(`Pengalaman: ${workLines.join("; ")}`);
  }

  const eduLines = [
    talent.education?.trim(),
    ...(talent.educationHistory ?? []).map((item) =>
      [item.degree?.trim(), item.fieldOfStudy?.trim(), item.institution?.trim()]
        .filter(Boolean)
        .join(" ")
    ),
  ].filter((part): part is string => Boolean(part));

  if (eduLines.length > 0) {
    const uniqueEdu = Array.from(new Set(eduLines));
    sections.push(`Pendidikan: ${uniqueEdu.join("; ")}`);
  }

  if (talent.cvExtractedText?.trim()) {
    sections.push(`Isi CV:\n${talent.cvExtractedText.trim()}`);
  }

  return cleanTextForEmbedding(sections.join("\n"));
}

/**
 * Menyusun dokumen teks representatif Peluang (judul + kategori + skill + deskripsi).
 */
export function buildOpportunityEmbeddingDocument(
  opportunity: OpportunityMatchInput,
  normalizedSkillLabels: readonly string[] = []
): string {
  const sections: string[] = [];

  if (opportunity.title?.trim()) {
    sections.push(`Judul Peluang: ${opportunity.title.trim()}`);
  }

  if (opportunity.category?.trim()) {
    sections.push(`Kategori: ${opportunity.category.trim()}`);
  }

  const skillsToShow =
    normalizedSkillLabels.length > 0
      ? normalizedSkillLabels
      : opportunity.requiredSkills.map((s) => s.trim()).filter(Boolean);

  if (skillsToShow.length > 0) {
    sections.push(`Keterampilan Dibutuhkan: ${skillsToShow.join(", ")}`);
  }

  if (opportunity.description?.trim()) {
    sections.push(`Deskripsi: ${opportunity.description.trim()}`);
  }

  return cleanTextForEmbedding(sections.join("\n"));
}

async function getFeatureExtractionPipeline(
  modelId: string
): Promise<FeatureExtractionPipeline> {
  const state = getGlobalE5State();
  const existing = state.pipelines.get(modelId);
  if (existing) {
    return existing;
  }

  const loader = (async () => {
    const { env, pipeline } = await import("@huggingface/transformers");
    env.cacheDir =
      process.env.TALENT_E5_CACHE_DIR || path.join(process.cwd(), ".cache", "huggingface");
    const extractor = await pipeline("feature-extraction", modelId, {
      dtype: "q8",
    });
    return extractor as unknown as FeatureExtractionPipeline;
  })();

  state.pipelines.set(modelId, loader);
  try {
    return await loader;
  } catch (error) {
    state.pipelines.delete(modelId);
    throw error;
  }
}

function getCacheKey(modelId: string, kind: "query" | "passage", text: string): string {
  const digest = createHash("sha256").update(text).digest("hex");
  return `${modelId}:${kind}:${digest}`;
}

function setBoundedCache(cache: Map<string, number[]>, key: string, value: number[]) {
  if (cache.size >= MAX_VECTOR_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, value);
}

/**
 * Embedder lokal berbasis ONNX (`Xenova/multilingual-e5-small`) melalui `@huggingface/transformers`.
 * Dilengkapi prefix E5 otomatis, chunking + mean pooling untuk teks panjang, serta cache in-memory.
 */
export class MultilingualE5Embedder implements TextEmbedder {
  private readonly modelId: string;

  constructor(modelId: string = DEFAULT_E5_MODEL_ID) {
    this.modelId = modelId;
  }

  private async embedWithKind(kind: "query" | "passage", rawText: string): Promise<number[]> {
    const cleaned = cleanTextForEmbedding(rawText);
    if (!cleaned) return [];

    const state = getGlobalE5State();
    const cacheKey = getCacheKey(this.modelId, kind, cleaned);
    const cached = state.vectorCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const extractor = await getFeatureExtractionPipeline(this.modelId);
    const chunks = splitTextIntoChunks(cleaned);
    const format = kind === "query" ? formatE5Query : formatE5Passage;

    const chunkVectors: number[][] = [];
    for (const chunk of chunks) {
      const output = await extractor(format(chunk), {
        pooling: "mean",
        normalize: true,
      });
      chunkVectors.push(Array.from(output.data));
    }

    const finalVector =
      chunkVectors.length === 1
        ? chunkVectors[0]
        : averageAndNormalizeVectors(chunkVectors);

    setBoundedCache(state.vectorCache, cacheKey, finalVector);
    return finalVector;
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embedWithKind("query", text);
  }

  async embedPassage(text: string): Promise<number[]> {
    return this.embedWithKind("passage", text);
  }
}

let defaultEmbedderInstance: MultilingualE5Embedder | null = null;

export function getDefaultTalentEmbedder(): MultilingualE5Embedder {
  if (!defaultEmbedderInstance) {
    defaultEmbedderInstance = new MultilingualE5Embedder(DEFAULT_E5_MODEL_ID);
  }
  return defaultEmbedderInstance;
}

export function clearTalentEmbeddingCache(): void {
  getGlobalE5State().vectorCache.clear();
}
