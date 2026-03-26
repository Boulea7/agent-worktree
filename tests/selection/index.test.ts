import { describe, expectTypeOf, it } from "vitest";

import type {
  AttemptPromotionAuditSummary,
  AttemptPromotionDecisionSummary,
  AttemptPromotionTarget,
  AttemptSelectionResult
} from "../../src/selection/index.js";

describe("selection index exports", () => {
  it("should continue exporting the stable selection-facing types", () => {
    type SelectionIndexExports = {
      selection: AttemptSelectionResult;
      audit: AttemptPromotionAuditSummary;
      decision: AttemptPromotionDecisionSummary;
      target: AttemptPromotionTarget;
    };

    expectTypeOf<SelectionIndexExports>().not.toBeAny();
  });
});
