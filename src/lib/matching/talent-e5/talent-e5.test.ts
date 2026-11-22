import { describe, expect, it } from "vitest";
import {
  averageAndNormalizeVectors,
  buildOpportunityEmbeddingDocument,
  buildTalentEmbeddingDocument,
  calculateSemanticSimilarityScore,
  calculateSkillMatching,
  calculateVectorCosineSimilarity,
  calculateWeightedScore,
  extractKnownSkillsFromText,
  extractTalentNormalizedSkills,
  formatE5Passage,
  formatE5Query,
  normalizeAndDeduplicateSkills,
  normalizeSkill,
  rankOpportunitiesForTalent,
  splitTextIntoChunks,
  THESIS_WEIGHT_SCENARIOS,
  type OpportunityMatchInput,
  type TalentMatchProfileInput,
  type TextEmbedder,
} from "./index";

describe("Talent E5 — Rule-Based Skill Normalizer", () => {
  it("menormalisasi padanan istilah Indonesia, Inggris, dan singkatan ke bentuk kanonis", () => {
    expect(normalizeSkill("js")?.label).toBe("JavaScript");
    expect(normalizeSkill("ReactJS")?.label).toBe("React");
    expect(normalizeSkill("NextJS")?.label).toBe("Next.js");
    expect(normalizeSkill("desain grafis")?.label).toBe("Graphic Design");
    expect(normalizeSkill("desain antarmuka")?.label).toBe("UI/UX Design");
    expect(normalizeSkill("MySQL")?.label).toBe("SQL");
    expect(normalizeSkill("ms excel")?.label).toBe("Excel");
  });

  it("menghapus duplikat skill setelah normalisasi termasuk format dipisah koma/bullet", () => {
    const result = normalizeAndDeduplicateSkills([
      "React, ReactJS; react.js",
      "JavaScript • JS",
      "Desain Grafis",
      "Graphic Design",
    ]);

    expect(result.map((item) => item.label)).toEqual([
      "React",
      "JavaScript",
      "Graphic Design",
    ]);
  });

  it("mengekstrak skill yang dikenal dari teks bebas CV ATS tanpa false-positive kata biasa", () => {
    const cvText = [
      "Ringkasan: Mahasiswa Sistem Informasi Universitas Gunadarma.",
      "Pengalaman: Membangun dashboard web dengan Next.js, TypeScript, dan PostgreSQL.",
      "Merancang prototype antarmuka menggunakan Figma serta analisis data dengan Python.",
      "Mampu bekerja sama dalam tim dan siap berkembang.",
    ].join("\n");

    const extracted = extractKnownSkillsFromText(cvText).map((s) => s.label);
    expect(extracted).toContain("Next.js");
    expect(extracted).toContain("TypeScript");
    expect(extracted).toContain("SQL");
    expect(extracted).toContain("Figma");
    expect(extracted).toContain("Data Analysis");
    expect(extracted).toContain("Python");
    // Kata biasa "bekerja" / "siap" tidak boleh memicu alias pendek
    expect(extracted).not.toContain("Golang");
  });

  it("menggabungkan skill dari profil manual, bagian skills CV, dan teks CV tanpa duplikat", () => {
    const talent: TalentMatchProfileInput = {
      headline: "Frontend Developer",
      profileSkills: ["React", "HTML/CSS"],
      cvStructuredSkills: ["ReactJS, TypeScript"],
      cvExtractedText: "Berpengalaman membuat UI responsif dengan Next.js dan Figma.",
    };

    const merged = extractTalentNormalizedSkills(talent).map((s) => s.label);
    expect(merged).toEqual(
      expect.arrayContaining(["React", "HTML/CSS", "TypeScript", "Next.js", "Figma"])
    );
    expect(merged.filter((s) => s === "React")).toHaveLength(1);
  });
});

describe("Talent E5 — Embedding Helpers & Document Formatting", () => {
  it("menambahkan prefix wajib E5 (query: dan passage:) secara idempoten", () => {
    expect(formatE5Query("Frontend React Developer")).toBe("query: Frontend React Developer");
    expect(formatE5Query("query: Sudah berprefix")).toBe("query: Sudah berprefix");
    expect(formatE5Passage("Asisten Labkom Web")).toBe("passage: Asisten Labkom Web");
    expect(formatE5Passage("passage: Sudah berprefix")).toBe("passage: Sudah berprefix");
  });

  it("memecah CV panjang menjadi beberapa chunk tumpang-tindih di bawah batas token", () => {
    const longCv = Array.from({ length: 600 }, (_, i) => `kata${i + 1}`).join(" ");
    const chunks = splitTextIntoChunks(longCv, 250, 40);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].split(" ")).toHaveLength(250);
    // Pastikan ada overlap antara chunk 1 dan chunk 2
    expect(chunks[1].startsWith("kata211")).toBe(true);
  });

  it("merata-ratakan beberapa vektor chunk dan melakukan normalisasi L2", () => {
    const avg = averageAndNormalizeVectors([
      [1, 0, 0],
      [0, 1, 0],
    ]);
    const norm = Math.sqrt(avg.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1, 6);
    expect(avg[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(avg[1]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("menyusun dokumen Talent dan Peluang dengan prioritas informasi kunci di awal", () => {
    const talentDoc = buildTalentEmbeddingDocument(
      {
        headline: "Web Developer",
        bio: "Fokus frontend modern.",
        cvExtractedText: "Pengalaman membangun sistem informasi kampus.",
      },
      ["React", "TypeScript"]
    );
    expect(talentDoc.indexOf("Headline:")).toBeLessThan(talentDoc.indexOf("Keterampilan:"));
    expect(talentDoc.indexOf("Keterampilan:")).toBeLessThan(talentDoc.indexOf("Isi CV:"));

    const oppDoc = buildOpportunityEmbeddingDocument(
      {
        id: "p1",
        title: "Asisten Praktikum Web",
        category: "Labkom",
        description: "Membantu praktikum pemrograman web.",
        status: "open",
        requiredSkills: ["React", "HTML/CSS"],
      },
      ["React", "HTML/CSS"]
    );
    expect(oppDoc).toContain("Judul Peluang: Asisten Praktikum Web");
    expect(oppDoc).toContain("Kategori: Labkom");
    expect(oppDoc).toContain("Keterampilan Dibutuhkan: React, HTML/CSS");
  });
});

describe("Talent E5 — Cosine Similarity, Skill Matching, Weighted Scoring & Rule-Based", () => {
  it("menghitung Cosine Similarity dan Semantic Similarity Score (SS) sesuai Bab 3.5", () => {
    expect(calculateVectorCosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(calculateVectorCosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(calculateVectorCosineSimilarity([1, 0], [-1, 0])).toBe(-1);

    expect(calculateSemanticSimilarityScore(0.856)).toBe(85.6);
    expect(calculateSemanticSimilarityScore(-0.25)).toBe(0);
    expect(calculateSemanticSimilarityScore(1)).toBe(100);
  });

  it("menghitung Skill Matching (SM) bobot merata dan mengembalikan null jika peluang tanpa skill", () => {
    const talentSkills = normalizeAndDeduplicateSkills(["ReactJS", "MySQL", "Figma"]);

    const match = calculateSkillMatching(talentSkills, [
      "React",
      "SQL",
      "TypeScript",
      "Next.js",
    ]);
    expect(match).not.toBeNull();
    expect(match!.skillMatchingScore).toBe(50);
    expect(match!.skillGap.matchedSkills).toEqual(["React", "SQL"]);
    expect(match!.skillGap.unidentifiedSkills).toEqual(["TypeScript", "Next.js"]);

    // Peluang tanpa daftar skill tidak dihitung SM
    expect(calculateSkillMatching(talentSkills, [])).toBeNull();
  });

  it("menghitung Weighted Scoring (WS) untuk semua 5 kombinasi bobot Tabel 3.4", () => {
    const ss = 80;
    const sm = 50;

    const results = THESIS_WEIGHT_SCENARIOS.map((w) => ({
      label: w.label,
      ws: calculateWeightedScore(ss, sm, w),
    }));

    expect(results).toEqual([
      { label: "30:70", ws: 59 },
      { label: "40:60", ws: 62 },
      { label: "50:50", ws: 65 },
      { label: "60:40", ws: 68 },
      { label: "70:30", ws: 71 },
    ]);

    expect(() =>
      calculateWeightedScore(80, 50, { semanticSimilarity: 0.6, skillMatching: 0.6 })
    ).toThrow();
  });

  it("menerapkan Rule-Based filter (hanya aktif & berskill) serta mengurutkan berdasarkan WS", async () => {
    const mockEmbedder: TextEmbedder = {
      async embedQuery() {
        return [1, 0, 0];
      },
      async embedPassage(text: string) {
        if (text.includes("Frontend React")) return [0.9, 0.4359, 0]; // cos ≈ 0.90
        if (text.includes("Data Analyst")) return [0.5, 0.866, 0]; // cos ≈ 0.50
        return [0.2, 0.98, 0];
      },
    };

    const talent: TalentMatchProfileInput = {
      headline: "Frontend Developer",
      profileSkills: ["React", "TypeScript"],
      cvExtractedText: "Pengalaman membangun aplikasi web dengan Next.js dan Tailwind CSS.",
    };

    const opportunities: OpportunityMatchInput[] = [
      {
        id: "opp-closed",
        title: "Proyek Lama",
        description: "Sudah ditutup.",
        status: "closed",
        requiredSkills: ["React"],
      },
      {
        id: "opp-no-skills",
        title: "Proyek Tanpa Skill",
        description: "Deskripsi ada tetapi daftar skill kosong.",
        status: "open",
        requiredSkills: [],
      },
      {
        id: "opp-data",
        title: "Data Analyst Labkom",
        description: "Mengolah data praktikum dengan Python dan Excel.",
        status: "open",
        requiredSkills: ["Python", "Excel"],
      },
      {
        id: "opp-frontend",
        title: "Frontend React Labkom",
        description: "Membangun portal web menggunakan React, TypeScript, dan Next.js.",
        status: "open",
        requiredSkills: ["React", "TypeScript", "Next.js", "Docker"],
      },
    ];

    const result = await rankOpportunitiesForTalent(talent, opportunities, mockEmbedder);

    expect(result.excluded).toEqual([
      { opportunityId: "opp-closed", reason: "inactive_status" },
      { opportunityId: "opp-no-skills", reason: "missing_required_skills" },
    ]);

    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0].opportunityId).toBe("opp-frontend");
    // 3 dari 4 skill cocok (React, TypeScript, Next.js dari CV), Docker belum teridentifikasi
    expect(result.recommendations[0].skillMatchingScore).toBe(75);
    expect(result.recommendations[0].skillGap.matchedSkills).toEqual([
      "React",
      "TypeScript",
      "Next.js",
    ]);
    expect(result.recommendations[0].skillGap.unidentifiedSkills).toEqual(["Docker"]);
    expect(result.recommendations[0].weightedScore).toBeGreaterThan(
      result.recommendations[1].weightedScore
    );
  });
});
