import { describe, expect, it } from "vitest";
import { getUnreviewedApplicationIds } from "./review-gate";

describe("getUnreviewedApplicationIds", () => {
  it("returns only completed applications that have no review", () => {
    expect(
      getUnreviewedApplicationIds(["app-a", "app-b", "app-c"], ["app-b"])
    ).toEqual(["app-a", "app-c"]);
  });

  it("returns an empty list when every completed application is reviewed", () => {
    expect(getUnreviewedApplicationIds(["app-a"], ["app-a"])).toEqual([]);
    expect(getUnreviewedApplicationIds([], [])).toEqual([]);
  });
});
