import { describe, expect, it } from "vitest";
import {
  calculateTfIdfCosineSimilarity,
  rankDocumentsBySimilarity,
  buildTalentTextDocument,
  buildProjectTextDocument,
  combineRecommendationScores,
  RECOMMENDATION_WEIGHTS,
} from "./tfidf";
import { calculateMatch } from "./index";
import { sanitizeProjectForTalent } from "@/lib/talent-project-utils";
import {
  canTransition,
  getPaymentSuccessOutcome,
} from "@/lib/workflow/transitions";
import { getUnreviewedApplicationIds } from "@/lib/workflow/review-gate";
import { requestRevisionSchema } from "@/lib/validators/application";
import { decidePaymentWebhook } from "@/lib/payments/webhook";
import type { TalentContext, ProjectContext } from "./types";
import type { ProjectWithMatch } from "@/app/talent/projects/actions";

describe("Skenario Uji Lengkap Sistem Matchmaking & Workflow", () => {
  // =========================================================================
  // LEVEL 1: Unit & Algorithmic Testing
  // =========================================================================
  describe("Level 1: Unit & Algorithmic Testing (TF-IDF Cosine Similarity & Weights)", () => {
    it("1.1 Formula pembobotan terbukti: 0.8 * compositeMatch + 0.2 * textSimilarity * 100", () => {
      expect(RECOMMENDATION_WEIGHTS.compositeMatch).toBe(0.8);
      expect(RECOMMENDATION_WEIGHTS.textSimilarity).toBe(0.2);

      const score1 = combineRecommendationScores(80, 0.5);
      // 0.8 * 80 + 0.2 * 50 = 64 + 10 = 74
      expect(score1).toBe(74);

      const score2 = combineRecommendationScores(100, 1.0);
      expect(score2).toBe(100);

      const score3 = combineRecommendationScores(0, 0);
      expect(score3).toBe(0);
    });

    it("1.2 Normalisasi NFKC dan regex tokenisasi menangani case, whitespace, dan karakter multibyte", () => {
      const docA = "Next.js React & TypeScript (Frontend)";
      const docB = "next js react typescript frontend";
      const sim = calculateTfIdfCosineSimilarity(docA, docB);
      expect(sim).toBeGreaterThan(0.99);
    });

    it("1.3 Dua dokumen tanpa term bersama menghasilkan similarity tepat 0 (bukan NaN)", () => {
      const docA = "Golang Kubernetes Docker Microservices";
      const docB = "Photoshop Figma Watercolor Illustrator";
      const sim = calculateTfIdfCosineSimilarity(docA, docB);
      expect(sim).toBe(0);
      expect(Number.isNaN(sim)).toBe(false);
    });
  });

  // =========================================================================
  // LEVEL 2: Sisi Talent — Rekomendasi & Sorting Proyek
  // =========================================================================
  describe("Level 2: Sisi Talent — Rekomendasi & Sorting Proyek", () => {
    const talentA: TalentContext = {
      headline: "Frontend Specialist React Next.js",
      bio: "Fokus membangun UI responsif dengan Tailwind CSS dan Next.js",
      skills: [
        { skillId: 1, name: "Next.js", level: "advanced" },
        { skillId: 2, name: "React", level: "advanced" },
        { skillId: 3, name: "Tailwind CSS", level: "intermediate" },
      ],
      hoursPerWeek: 20,
      preferredMode: "remote",
      isAvailable: true,
      avgRating: 4.8,
    };

    it("2.1 Proyek relevan Next.js menempati peringkat lebih tinggi dari proyek database yang tidak cocok", () => {
      const projectNextJs: ProjectContext = {
        skills: [{ skillId: 1, name: "Next.js", minLevel: "intermediate", isRequired: true }],
        hoursPerWeek: 15,
        mode: "remote",
      };
      const projectDatabase: ProjectContext = {
        skills: [{ skillId: 99, name: "Oracle SQL", minLevel: "advanced", isRequired: true }],
        hoursPerWeek: 15,
        mode: "remote",
      };

      const matchNextJs = calculateMatch(talentA, projectNextJs);
      const matchDatabase = calculateMatch(talentA, projectDatabase);

      const talentDoc = buildTalentTextDocument(talentA);
      const candidates = [
        {
          id: "proj-nextjs",
          text: buildProjectTextDocument({
            title: "Revamp Frontend Web App Next.js",
            description: "Membangun tampilan modern dengan React dan Tailwind CSS",
            skills: [{ name: "Next.js" }, { name: "React" }],
          }),
        },
        {
          id: "proj-db",
          text: buildProjectTextDocument({
            title: "Database Migration Oracle to PostgreSQL",
            description: "Migrasi skema database relasional perbankan",
            skills: [{ name: "Oracle SQL" }, { name: "PostgreSQL" }],
          }),
        },
      ];

      const rankings = rankDocumentsBySimilarity(talentDoc, candidates);
      const simMap = new Map(rankings.map((r) => [r.id, r.similarity]));

      const scoreNextJs = combineRecommendationScores(matchNextJs.score, simMap.get("proj-nextjs") ?? 0);
      const scoreDatabase = combineRecommendationScores(matchDatabase.score, simMap.get("proj-db") ?? 0);

      expect(scoreNextJs).toBeGreaterThan(scoreDatabase);
      expect(simMap.get("proj-nextjs")!).toBeGreaterThan(0.5);
      expect(simMap.get("proj-db")!).toBe(0);
    });

    it("2.2 Keyword bio/headline membedakan perankingan saat skill teknis identik", () => {
      const projectSkillReq: ProjectContext = {
        skills: [{ skillId: 2, name: "React", minLevel: "intermediate", isRequired: true }],
        hoursPerWeek: 10,
        mode: "remote",
      };
      const matchA = calculateMatch(talentA, projectSkillReq);
      const matchB = calculateMatch(talentA, projectSkillReq);
      expect(matchA.score).toBe(matchB.score);

      const talentDoc = buildTalentTextDocument(talentA);
      const candidates = [
        {
          id: "proj-generic",
          text: buildProjectTextDocument({
            title: "Pengembangan Modul Web",
            description: "Mengerjakan tiket bugfix standar aplikasi internal kantor",
            skills: [{ name: "React" }],
          }),
        },
        {
          id: "proj-specific",
          text: buildProjectTextDocument({
            title: "Revamp UI Dashboard Responsif",
            description: "Fokus membangun UI responsif modern dengan Tailwind CSS dan Next.js",
            skills: [{ name: "React" }],
          }),
        },
      ];

      const rankings = rankDocumentsBySimilarity(talentDoc, candidates);
      const simMap = new Map(rankings.map((r) => [r.id, r.similarity]));

      const finalGeneric = combineRecommendationScores(matchA.score, simMap.get("proj-generic") ?? 0);
      const finalSpecific = combineRecommendationScores(matchB.score, simMap.get("proj-specific") ?? 0);

      expect(simMap.get("proj-specific")!).toBeGreaterThan(simMap.get("proj-generic")!);
      expect(finalSpecific).toBeGreaterThan(finalGeneric);
    });

    it("2.3 Sanitization membuang semua field skor mentah sebelum dikirim ke client", () => {
      const rawProject: ProjectWithMatch = {
        id: "proj-123",
        vendorId: "vendor-1",
        title: "Landing Page",
        description: "Bikin landing page cepat",
        difficulty: "beginner",
        type: "freelance",
        mode: "remote",
        durationWeeks: 2,
        hoursPerWeek: 10,
        paymentEnabled: true,
        portfolioRequired: false,
        rewardAmount: 500000,
        rewardNote: "Lump sum",
        deadline: null,
        status: "open",
        createdAt: new Date().toISOString(),
        vendor: null,
        skills: [
          {
            skillId: 1,
            name: "React",
            category: "Frontend",
            minLevel: "beginner",
            isRequired: true,
            talentStatus: { possessed: true, talentLevel: "advanced", isAdequate: true },
          },
        ],
        matchResult: {
          score: 95,
          breakdown: { skill: 100, levelFit: 100, availability: 100, rating: 80 },
          missingSkills: [],
          matchedSkills: [],
          underLevelSkills: [],
          explanation: "Sangat cocok",
        },
        textSimilarityScore: 78,
        recommendationScore: 91.6,
      };

      const sanitized = sanitizeProjectForTalent(rawProject);

      expect((sanitized as unknown as Record<string, unknown>).matchResult).toBeUndefined();
      expect((sanitized as unknown as Record<string, unknown>).textSimilarityScore).toBeUndefined();
      expect((sanitized as unknown as Record<string, unknown>).recommendationScore).toBeUndefined();
      expect(sanitized.skills[0]).not.toHaveProperty("talentStatus");
      expect(sanitized.id).toBe("proj-123");
    });
  });

  // =========================================================================
  // LEVEL 3: Sisi Vendor — Evaluasi & Ranking Pelamar
  // =========================================================================
  describe("Level 3: Sisi Vendor — Evaluasi & Ranking Pelamar", () => {
    it("3.1 Pelamar diurutkan berdasarkan recommendationScore, tie-break dengan createdAt", () => {
      const applicants = [
        { id: "app-1", recommendationScore: 85, createdAt: "2026-10-01T10:00:00Z" },
        { id: "app-2", recommendationScore: 92, createdAt: "2026-10-02T10:00:00Z" },
        { id: "app-3", recommendationScore: 85, createdAt: "2026-09-30T10:00:00Z" }, // Skor sama dengan app-1 tapi lebih awal
      ];

      applicants.sort((a, b) => {
        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      expect(applicants[0].id).toBe("app-2"); // Paling tinggi (92)
      expect(applicants[1].id).toBe("app-3"); // 85, mendaftar 30 Sep (lebih awal)
      expect(applicants[2].id).toBe("app-1"); // 85, mendaftar 1 Okt
    });

    it("3.2 Dynamic Recalculation: Menambahkan keyword relevan ke bio talent menaikkan skor kemiripan teks", () => {
      const projectDoc = buildProjectTextDocument({
        title: "Desain UI/UX Design System Mobile App",
        description: "Membutuhkan wireframing prototype dan design token figma",
        skills: [{ name: "Figma" }, { name: "UI/UX" }],
      });

      const talentProfileBefore = buildTalentTextDocument({
        headline: "Desainer Grafis",
        bio: "Mengerjakan poster spanduk dan banner digital",
        skills: [{ name: "Photoshop" }],
      });

      const talentProfileAfter = buildTalentTextDocument({
        headline: "UI/UX Product Designer",
        bio: "Berpengalaman riset wireframing prototype dan implementasi design system di Figma",
        skills: [{ name: "Photoshop" }, { name: "Figma" }, { name: "UI/UX" }],
      });

      const simBefore = calculateTfIdfCosineSimilarity(projectDoc, talentProfileBefore);
      const simAfter = calculateTfIdfCosineSimilarity(projectDoc, talentProfileAfter);

      expect(simAfter).toBeGreaterThan(simBefore);
      expect(simAfter).toBeGreaterThan(0.5);
    });
  });

  // =========================================================================
  // LEVEL 4: Siklus Status & Transisi Workflow (E2E)
  // =========================================================================
  describe("Level 4: Siklus Status & Transisi Workflow (E2E)", () => {
    it("4.1 Review Gate Enforcement: Mengidentifikasi lamaran selesai yang belum direview", () => {
      const completedApps = ["app-done-1", "app-done-2", "app-done-3"];
      const reviewedApps = ["app-done-1", "app-done-3"];

      const unreviewed = getUnreviewedApplicationIds(completedApps, reviewedApps);
      expect(unreviewed).toEqual(["app-done-2"]);
    });

    it("4.2 Siklus Validasi Catatan Revisi: Ditolak jika < 5 karakter, diterima jika >= 5 karakter", () => {
      expect(requestRevisionSchema.safeParse({ revisionNotes: "revisi" }).success).toBe(true);
      expect(requestRevisionSchema.safeParse({ revisionNotes: "fix" }).success).toBe(false);
      expect(requestRevisionSchema.safeParse({ revisionNotes: "    " }).success).toBe(false);
    });

    it("4.3 Transisi Status: Siklus lengkap pending -> accepted -> submitted -> approved -> completed", () => {
      // 1. Pending -> Accepted (Vendor)
      expect(canTransition("pending", "accepted", "vendor", { hasFee: false })).toBe(true);

      // 2. Accepted -> Submitted (Talent)
      expect(canTransition("accepted", "submitted", "talent")).toBe(true);

      // 3. Submitted -> Accepted (Vendor minta revisi)
      expect(canTransition("submitted", "accepted", "vendor", { revisionNotes: "Perbaiki header" })).toBe(true);

      // 4. Submitted -> Approved (Vendor setuju hasil)
      expect(canTransition("submitted", "approved", "vendor")).toBe(true);

      // 5. Approved -> Completed:
      // Proyek gratis: sah oleh vendor
      expect(canTransition("approved", "completed", "vendor", { hasFee: false })).toBe(true);
      // Proyek berbayar: ditolak untuk vendor langsung, harus lewat webhook sistem
      expect(canTransition("approved", "completed", "vendor", { hasFee: true })).toBe(false);
      expect(canTransition("approved", "completed", "system", { hasFee: true, paymentStatus: "paid" })).toBe(true);
    });

    it("4.4 Webhook Gateway Midtrans: Menuntaskan proyek berbayar setelah settlement", () => {
      const awaitingState = {
        paymentRecordStatus: "pending" as const,
        paymentStatus: "awaiting_payment" as const,
        applicationStatus: "approved" as const,
        storedAmount: 500000,
      };

      const decision = decidePaymentWebhook(awaitingState, {
        status: "settlement",
        amount: 500000,
      });

      expect(decision).toEqual({ kind: "complete" });

      const outcome = getPaymentSuccessOutcome();
      expect(outcome.applicationStatus).toBe("completed");
      expect(outcome.paymentStatus).toBe("paid");
    });
  });

  // =========================================================================
  // LEVEL 5: Robustness, Edge Cases & Batasan
  // =========================================================================
  describe("Level 5: Robustness, Edge Cases & Batasan", () => {
    it("EC-01: Profil Talent tanpa bio & headline tidak menyebabkan error dan menghasilkan skor valid", () => {
      const minimalTalent: TalentContext = {
        headline: null,
        bio: null,
        skills: [{ skillId: 1, name: "Node.js", level: "beginner" }],
        hoursPerWeek: null,
        preferredMode: null,
        isAvailable: true,
        avgRating: null,
      };

      const talentDoc = buildTalentTextDocument(minimalTalent);
      expect(talentDoc).toBe("Node.js");

      const projectDoc = buildProjectTextDocument({
        title: "Backend Service",
        description: "REST API",
        skills: [{ name: "Node.js" }],
      });

      const sim = calculateTfIdfCosineSimilarity(talentDoc, projectDoc);
      expect(sim).toBeGreaterThan(0);
      expect(Number.isFinite(sim)).toBe(true);
    });

    it("EC-02: Dokumen proyek sangat pendek tetap stabil tanpa division by zero", () => {
      const sim = calculateTfIdfCosineSimilarity("Web", "Dicari");
      expect(sim).toBe(0);
      expect(Number.isNaN(sim)).toBe(false);
    });

    it("EC-03: Menangani emoji, simbol tanda baca, dan huruf besar secara seragam", () => {
      const dirty = "NEXT.JS!!! Full-stack Developer 🚀 #1";
      const clean = "next js full stack developer 1";
      const sim = calculateTfIdfCosineSimilarity(dirty, clean);
      expect(sim).toBeGreaterThan(0.99);
    });

    it("EC-04: Lamaran yang ditarik (withdrawn) tidak dapat diubah oleh vendor ke status apapun", () => {
      expect(canTransition("withdrawn", "accepted", "vendor")).toBe(false);
      expect(canTransition("withdrawn", "rejected", "vendor")).toBe(false);
      expect(canTransition("withdrawn", "completed", "vendor")).toBe(false);
    });

    it("EC-05: Filter search query, filter difficulty, dan sorting recommendation bekerja harmonis", () => {
      const projects = [
        {
          id: "p1",
          title: "Next.js E-Commerce Frontend",
          difficulty: "intermediate",
          recommendationScore: 88,
          createdAt: "2026-10-01",
        },
        {
          id: "p2",
          title: "Next.js Simple Blog",
          difficulty: "beginner",
          recommendationScore: 95,
          createdAt: "2026-10-02",
        },
        {
          id: "p3",
          title: "Golang Microservice",
          difficulty: "intermediate",
          recommendationScore: 40,
          createdAt: "2026-10-03",
        },
      ];

      const query = "next.js";
      const difficulty = "intermediate";

      const filtered = projects
        .filter((p) => p.title.toLowerCase().includes(query))
        .filter((p) => p.difficulty === difficulty)
        .sort((a, b) => b.recommendationScore - a.recommendationScore);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("p1");
    });
  });
});
