import {
  DEFAULT_E5_MODEL_ID,
  getDefaultTalentEmbedder,
  rankOpportunitiesForTalent,
  THESIS_WEIGHT_SCENARIOS,
  type OpportunityMatchInput,
  type TalentMatchProfileInput,
} from "../src/lib/matching/talent-e5";

async function main() {
  console.log("Model:", DEFAULT_E5_MODEL_ID);
  console.log("Memuat model & menghitung embedding (unduhan pertama ~118MB)...");

  const t0 = Date.now();
  const embedder = getDefaultTalentEmbedder();

  const talent: TalentMatchProfileInput = {
    headline: "Frontend Developer | Mahasiswa Sistem Informasi Universitas Gunadarma",
    bio: "Fokus membangun antarmuka web modern, responsif, dan ramah pengguna.",
    education: "S1 Sistem Informasi Universitas Gunadarma",
    profileSkills: ["React", "HTML/CSS"],
    cvExtractedText:
      "Pengalaman proyek kampus: membangun aplikasi dashboard akademik menggunakan Next.js, TypeScript, dan database PostgreSQL. Terbiasa kolaborasi menggunakan Git serta perancangan antarmuka pengguna dengan Figma.",
  };

  const opportunities: OpportunityMatchInput[] = [
    {
      id: "opp-web-labkom",
      title: "Asisten Pengembang Portal Web Labkom",
      category: "Pengembangan Web",
      description:
        "Membangun dan memelihara antarmuka website informasi praktikum serta dashboard nilai mahasiswa berbasis React, TypeScript, dan Next.js.",
      status: "open",
      requiredSkills: ["React", "TypeScript", "Next.js", "Figma"],
    },
    {
      id: "opp-backend-labkom",
      title: "Pengembang Sistem Basis Data & API Praktikum",
      category: "Backend & Database",
      description:
        "Merancang struktur basis data SQL, membuat REST API dengan Node.js, dan mengelola integrasi server praktikum.",
      status: "open",
      requiredSkills: ["Node.js", "SQL", "REST API", "Git"],
    },
    {
      id: "opp-data-labkom",
      title: "Asisten Analisis Data Evaluasi Praktikum",
      category: "Data Analytics",
      description:
        "Mengolah data nilai dan kehadiran praktikum menggunakan Python, Microsoft Excel, dan menyusun visualisasi dashboard Power BI.",
      status: "open",
      requiredSkills: ["Python", "Excel", "Power BI", "Data Visualization"],
    },
    {
      id: "opp-design-umkm",
      title: "Desainer Poster & Konten Feed Instagram",
      category: "Desain Grafis",
      description:
        "Membuat template konten media sosial Instagram dan poster cetak promosi menggunakan Canva dan Adobe Photoshop.",
      status: "open",
      requiredSkills: ["Graphic Design", "Canva", "Adobe Photoshop"],
    },
    {
      id: "opp-no-skill",
      title: "Relawan Umum Acara Kampus",
      category: "Lainnya",
      description: "Membantu koordinasi logistik acara seminar kampus.",
      status: "open",
      requiredSkills: [],
    },
  ];

  // Skenario default 50:50
  const result50 = await rankOpportunitiesForTalent(
    talent,
    opportunities,
    embedder,
    THESIS_WEIGHT_SCENARIOS[2]
  );

  console.log(`\nSelesai dalam ${Date.now() - t0} ms`);
  console.log(
    "Skill Talent terdeteksi (Profil + CV + Normalisasi):",
    result50.talentNormalizedSkills.map((s) => s.label).join(", ")
  );
  console.log("Peluang dikecualikan (Rule-Based):", result50.excluded);

  console.log("\n=== HASIL REKOMENDASI (BOBOT DEFAULT 50:50) ===");
  console.table(
    result50.recommendations.map((r, idx) => ({
      Rank: idx + 1,
      Peluang: r.opportunityId,
      Cosine: Number(r.cosineSimilarity.toFixed(4)),
      "SS (%)": r.semanticSimilarityScore,
      "SM (%)": r.skillMatchingScore,
      "WS 50:50 (%)": r.weightedScore,
      "Skill Cocok": r.skillGap.matchedSkills.join(", ") || "-",
      "Belum Teridentifikasi": r.skillGap.unidentifiedSkills.join(", ") || "-",
    }))
  );

  console.log("\n=== PERBANDINGAN 5 KOMBINASI BOBOT (TABEL 3.4) ===");
  const t1 = Date.now();
  const comparisonRows: Record<string, string | number>[] = [];

  for (const opp of result50.recommendations) {
    const row: Record<string, string | number> = {
      Peluang: opp.opportunityId,
      SS: opp.semanticSimilarityScore,
      SM: opp.skillMatchingScore,
    };
    for (const preset of THESIS_WEIGHT_SCENARIOS) {
      const ws =
        preset.semanticSimilarity * opp.semanticSimilarityScore +
        preset.skillMatching * opp.skillMatchingScore;
      row[`WS ${preset.label}`] = Math.round(ws * 100) / 100;
    }
    comparisonRows.push(row);
  }
  console.table(comparisonRows);
  console.log(`Waktu hitung ulang dari cache: ${Date.now() - t1} ms`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
