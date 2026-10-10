import { describe, expect, it } from "vitest";
import {
  buildProjectTextDocument,
  buildTalentTextDocument,
  calculateTfIdfCosineSimilarity,
  combineRecommendationScores,
  rankDocumentsBySimilarity,
  RECOMMENDATION_WEIGHTS,
} from "./tfidf";

describe("TF-IDF cosine similarity", () => {
  it("returns 1 for identical documents", () => {
    expect(calculateTfIdfCosineSimilarity("React TypeScript", "React TypeScript")).toBe(1);
  });

  it("normalizes case, whitespace, and Unicode text consistently", () => {
    expect(calculateTfIdfCosineSimilarity("  REACT   Typescript ", "react typescript")).toBe(1);
  });

  it("returns 0 for documents with no shared terms", () => {
    expect(calculateTfIdfCosineSimilarity("React frontend", "akuntansi pajak")).toBe(0);
  });

  it("returns 0 for empty text and text that tokenizes to nothing", () => {
    expect(calculateTfIdfCosineSimilarity("", "React")).toBe(0);
    expect(calculateTfIdfCosineSimilarity("!!! --", "???")).toBe(0);
    expect(calculateTfIdfCosineSimilarity("", "")).toBe(0);
  });

  it("always returns a finite score in the inclusive 0-1 range", () => {
    const score = calculateTfIdfCosineSimilarity(
      "React React TypeScript",
      "React TypeScript dashboard",
      ["React React TypeScript", "React TypeScript dashboard", "SQL database"]
    );
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("gives more weight to terms that are rare across the candidate corpus", () => {
    const ranked = rankDocumentsBySimilarity("common rare", [
      { id: "common", text: "common" },
      { id: "rare", text: "rare" },
      { id: "common-a", text: "common alpha" },
      { id: "common-b", text: "common beta" },
      { id: "common-c", text: "common gamma" },
      { id: "common-d", text: "common delta" },
    ]);

    expect(ranked[0].id).toBe("rare");
    expect(ranked[0].similarity).toBeGreaterThan(
      ranked.find((candidate) => candidate.id === "common")!.similarity
    );
  });

  it("ranks projects for a talent from most to least textually relevant", () => {
    const talentDocument = buildTalentTextDocument({
      headline: "Frontend developer",
      bio: "Building accessible web dashboards",
      skills: [{ name: "React" }, { name: "TypeScript" }],
    });
    const ranked = rankDocumentsBySimilarity(talentDocument, [
      {
        id: "unrelated",
        text: buildProjectTextDocument({
          title: "Tax accounting",
          description: "Prepare annual financial reports",
          skills: [{ name: "Accounting" }],
        }),
      },
      {
        id: "relevant",
        text: buildProjectTextDocument({
          title: "Build a web dashboard",
          description: "Create an accessible frontend application",
          skills: [{ name: "React" }, { name: "TypeScript" }],
        }),
      },
    ]);

    expect(ranked[0].id).toBe("relevant");
    expect(ranked[0].similarity).toBeGreaterThan(ranked[1].similarity);
  });

  it("ranks talent profiles for a project from most to least textually relevant", () => {
    const projectDocument = buildProjectTextDocument({
      title: "Build a web dashboard",
      description: "Create an accessible frontend application",
      skills: [{ name: "React" }, { name: "TypeScript" }],
    });
    const ranked = rankDocumentsBySimilarity(projectDocument, [
      {
        id: "unrelated",
        text: buildTalentTextDocument({
          headline: "Accountant",
          bio: "Tax and financial reporting",
          skills: [{ name: "Accounting" }],
        }),
      },
      {
        id: "relevant",
        text: buildTalentTextDocument({
          headline: "Frontend developer",
          bio: "Building accessible web dashboards",
          skills: [{ name: "React" }, { name: "TypeScript" }],
        }),
      },
    ]);

    expect(ranked[0].id).toBe("relevant");
    expect(ranked[0].similarity).toBeGreaterThan(ranked[1].similarity);
  });

  it("combines the existing score and similarity using explicit 80/20 weights", () => {
    expect(RECOMMENDATION_WEIGHTS.compositeMatch).toBe(0.8);
    expect(RECOMMENDATION_WEIGHTS.textSimilarity).toBe(0.2);
    expect(combineRecommendationScores(75, 0.5)).toBe(70);
  });
});
