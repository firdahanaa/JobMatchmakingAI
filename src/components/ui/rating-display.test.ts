import { describe, expect, it } from "vitest";
import { formatRatingDisplay } from "./rating-display";

describe("formatRatingDisplay", () => {
  it("uses an explicit empty state when there are no reviews", () => {
    expect(formatRatingDisplay(null)).toBe("Belum ada rating");
    expect(formatRatingDisplay(undefined)).toBe("Belum ada rating");
  });

  it("formats a real average without inventing a default score", () => {
    expect(formatRatingDisplay(4.25)).toBe("4.3 / 5.0");
  });
});
