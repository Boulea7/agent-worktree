import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import { attemptSourceKinds } from "../../src/manifest/types.js";
import { normalizePromotionAttemptSourceKind } from "../../src/selection/promotion-source-kind.js";

describe("selection promotion-source-kind helpers", () => {
  it("should pass through undefined source kinds", () => {
    expect(
      normalizePromotionAttemptSourceKind(
        undefined,
        "Attempt promotion sourceKind must use the existing attempt source vocabulary."
      )
    ).toBeUndefined();
  });

  it("should accept every existing attempt source kind", () => {
    for (const sourceKind of attemptSourceKinds) {
      expect(
        normalizePromotionAttemptSourceKind(
          sourceKind,
          "Attempt promotion sourceKind must use the existing attempt source vocabulary."
        )
      ).toBe(sourceKind);
    }
  });

  it("should reject invalid source kinds", () => {
    expect(() =>
      normalizePromotionAttemptSourceKind(
        "shadow",
        "Attempt promotion sourceKind must use the existing attempt source vocabulary."
      )
    ).toThrow(ValidationError);
    expect(() =>
      normalizePromotionAttemptSourceKind(
        null,
        "Attempt promotion sourceKind must use the existing attempt source vocabulary."
      )
    ).toThrow(
      "Attempt promotion sourceKind must use the existing attempt source vocabulary."
    );
  });
});
