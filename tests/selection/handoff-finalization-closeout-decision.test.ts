import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type { AttemptHandoffFinalizationClosureSummary } from "../../src/selection/internal.js";

type CloseoutDecisionSummaryShape = {
  decisionBasis: string;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
  blockingReasons: string[];
  canAdvanceFromCloseout: boolean;
  hasBlockingReasons: boolean;
};

const deriveAttemptHandoffFinalizationCloseoutDecisionSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationCloseoutDecisionSummary: (
      input: AttemptHandoffFinalizationClosureSummary | undefined
    ) => CloseoutDecisionSummaryShape | undefined;
  }>
).deriveAttemptHandoffFinalizationCloseoutDecisionSummary as (
  input: AttemptHandoffFinalizationClosureSummary | undefined
) => CloseoutDecisionSummaryShape | undefined;

describe("selection handoff-finalization-closeout-decision helpers", () => {
  it("should return undefined when the supplied closure summary is undefined", () => {
    expect(
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(undefined)
    ).toBeUndefined();
  });

  it("should fail loudly when the supplied closure summary is null", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(null as never);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closeout decision summary requires summary to be an object."
    );
  });

  it("should derive a no-results blocker when the closeout is empty", () => {
    expect(
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          groupCount: 0,
          reportingDisposition: "empty",
          hasResults: false,
          allResultsInvoked: false,
          allResultsBlocked: false,
          hasMixedDisposition: false
        })
      )
    ).toEqual({
      decisionBasis: "handoff_finalization_closure_summary",
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      groupCount: 0,
      reportingDisposition: "empty",
      blockingReasons: ["no_results"],
      canAdvanceFromCloseout: false,
      hasBlockingReasons: true
    });
  });

  it("should derive an unsupported blocker when all closeout results are blocked", () => {
    expect(
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2,
          groupCount: 1,
          reportingDisposition: "all_blocked",
          hasResults: true,
          allResultsInvoked: false,
          allResultsBlocked: true,
          hasMixedDisposition: false
        })
      )
    ).toEqual({
      decisionBasis: "handoff_finalization_closure_summary",
      resultCount: 2,
      invokedResultCount: 0,
      blockedResultCount: 2,
      groupCount: 1,
      reportingDisposition: "all_blocked",
      blockingReasons: ["handoff_finalization_unsupported"],
      canAdvanceFromCloseout: false,
      hasBlockingReasons: true
    });
  });

  it("should stay advance-ready when all closeout results were invoked", () => {
    expect(
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 3,
          invokedResultCount: 3,
          blockedResultCount: 0,
          groupCount: 1,
          reportingDisposition: "all_invoked",
          hasResults: true,
          allResultsInvoked: true,
          allResultsBlocked: false,
          hasMixedDisposition: false
        })
      )
    ).toEqual({
      decisionBasis: "handoff_finalization_closure_summary",
      resultCount: 3,
      invokedResultCount: 3,
      blockedResultCount: 0,
      groupCount: 1,
      reportingDisposition: "all_invoked",
      blockingReasons: [],
      canAdvanceFromCloseout: true,
      hasBlockingReasons: false
    });
  });

  it("should derive a mixed-disposition blocker when closeout results are mixed", () => {
    expect(
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 4,
          invokedResultCount: 2,
          blockedResultCount: 2,
          groupCount: 2,
          reportingDisposition: "mixed",
          hasResults: true,
          allResultsInvoked: false,
          allResultsBlocked: false,
          hasMixedDisposition: true
        })
      )
    ).toEqual({
      decisionBasis: "handoff_finalization_closure_summary",
      resultCount: 4,
      invokedResultCount: 2,
      blockedResultCount: 2,
      groupCount: 2,
      reportingDisposition: "mixed",
      blockingReasons: ["handoff_finalization_mixed_disposition"],
      canAdvanceFromCloseout: false,
      hasBlockingReasons: true
    });
  });

  it("should fail loudly when the supplied closure basis drifts from the current layer", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary({
        ...createClosureSummary({
          resultCount: 1,
          invokedResultCount: 1,
          blockedResultCount: 0,
          groupCount: 1,
          reportingDisposition: "all_invoked",
          hasResults: true,
          allResultsInvoked: true,
          allResultsBlocked: false,
          hasMixedDisposition: false
        }),
        closureBasis: "handoff_finalization_grouped_reporting_summary"
      } as never);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      'Attempt handoff finalization closeout decision summary requires summary.closureBasis to be "handoff_finalization_grouped_reporting_disposition_summary".'
    );
  });

  it("should fail closed when reading closure booleans throws through an accessor-shaped input", () => {
    const summary = createClosureSummary({
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      groupCount: 1,
      reportingDisposition: "all_invoked",
      hasResults: true,
      allResultsInvoked: true,
      allResultsBlocked: false,
      hasMixedDisposition: false
    });
    Object.defineProperty(summary, "hasResults", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });

    const act = () =>
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(summary as never);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closeout decision summary requires summary.hasResults to match the canonical result-count derivation."
    );
  });

  it("should fail loudly when the closeout booleans drift from canonical count-derived state", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2,
          groupCount: 1,
          reportingDisposition: "all_blocked",
          hasResults: true,
          allResultsInvoked: false,
          allResultsBlocked: false,
          hasMixedDisposition: false
        })
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closeout decision summary requires summary.allResultsBlocked to match the canonical count-derived state."
    );
  });

  it("should fail loudly when reportingDisposition uses unknown closure vocabulary", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 1,
          invokedResultCount: 1,
          blockedResultCount: 0,
          groupCount: 1,
          reportingDisposition: "unsupported" as never,
          hasResults: true,
          allResultsInvoked: true,
          allResultsBlocked: false,
          hasMixedDisposition: false
        })
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closeout decision summary requires summary.reportingDisposition to use the existing grouped reporting disposition vocabulary."
    );
  });

  it("should fail loudly when groupCount drifts from the canonical reporting-disposition-derived count", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 2,
          invokedResultCount: 2,
          blockedResultCount: 0,
          groupCount: 99,
          reportingDisposition: "all_invoked",
          hasResults: true,
          allResultsInvoked: true,
          allResultsBlocked: false,
          hasMixedDisposition: false
        })
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closeout decision summary requires summary.groupCount to match the canonical group count derived from summary.reportingDisposition."
    );
  });

  it("should keep the decision summary shape minimal without leaking lower-layer closeout detail", () => {
    const result =
      deriveAttemptHandoffFinalizationCloseoutDecisionSummary(
        createClosureSummary({
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2,
          groupCount: 1,
          reportingDisposition: "all_blocked",
          hasResults: true,
          allResultsInvoked: false,
          allResultsBlocked: true,
          hasMixedDisposition: false
        })
      );

    expect(result).toBeDefined();
    expect(Object.keys(result ?? {}).sort()).toEqual(
      [
        "blockedResultCount",
        "blockingReasons",
        "canAdvanceFromCloseout",
        "decisionBasis",
        "groupCount",
        "hasBlockingReasons",
        "invokedResultCount",
        "reportingDisposition",
        "resultCount"
      ].sort()
    );
    expect(result).not.toHaveProperty("hasResults");
    expect(result).not.toHaveProperty("allResultsInvoked");
    expect(result).not.toHaveProperty("allResultsBlocked");
    expect(result).not.toHaveProperty("hasMixedDisposition");
  });
});

function createClosureSummary(
  input: Omit<AttemptHandoffFinalizationClosureSummary, "closureBasis">
): AttemptHandoffFinalizationClosureSummary {
  return {
    closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
    ...input
  };
}
