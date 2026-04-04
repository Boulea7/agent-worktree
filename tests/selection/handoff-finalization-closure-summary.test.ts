import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type { AttemptHandoffFinalizationGroupedReportingDispositionSummary } from "../../src/selection/types.js";

type ClosureSummaryShape = {
  closureBasis: string;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
  hasResults: boolean;
  allResultsInvoked: boolean;
  allResultsBlocked: boolean;
  hasMixedDisposition: boolean;
};

const deriveAttemptHandoffFinalizationClosureSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationClosureSummary: (
      input: AttemptHandoffFinalizationGroupedReportingDispositionSummary | undefined
    ) => ClosureSummaryShape | undefined;
  }>
).deriveAttemptHandoffFinalizationClosureSummary as (
  input: AttemptHandoffFinalizationGroupedReportingDispositionSummary | undefined
) => ClosureSummaryShape | undefined;

describe("selection handoff-finalization-closure-summary helpers", () => {
  it("should return undefined when the supplied grouped reporting disposition summary is undefined", () => {
    expect(
      deriveAttemptHandoffFinalizationClosureSummary(undefined)
    ).toBeUndefined();
  });

  it("should derive a stable empty closure summary", () => {
    expect(
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          groupCount: 0,
          reportingDisposition: "empty"
        })
      )
    ).toEqual({
      closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      groupCount: 0,
      reportingDisposition: "empty",
      hasResults: false,
      allResultsInvoked: false,
      allResultsBlocked: false,
      hasMixedDisposition: false
    });
  });

  it("should derive a stable all-invoked closure summary", () => {
    expect(
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 3,
          invokedResultCount: 3,
          blockedResultCount: 0,
          groupCount: 1,
          reportingDisposition: "all_invoked"
        })
      )
    ).toEqual({
      closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
      resultCount: 3,
      invokedResultCount: 3,
      blockedResultCount: 0,
      groupCount: 1,
      reportingDisposition: "all_invoked",
      hasResults: true,
      allResultsInvoked: true,
      allResultsBlocked: false,
      hasMixedDisposition: false
    });
  });

  it("should derive a stable all-blocked closure summary", () => {
    expect(
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2,
          groupCount: 1,
          reportingDisposition: "all_blocked"
        })
      )
    ).toEqual({
      closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
      resultCount: 2,
      invokedResultCount: 0,
      blockedResultCount: 2,
      groupCount: 1,
      reportingDisposition: "all_blocked",
      hasResults: true,
      allResultsInvoked: false,
      allResultsBlocked: true,
      hasMixedDisposition: false
    });
  });

  it("should derive a stable mixed closure summary", () => {
    expect(
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 5,
          invokedResultCount: 3,
          blockedResultCount: 2,
          groupCount: 2,
          reportingDisposition: "mixed"
        })
      )
    ).toEqual({
      closureBasis: "handoff_finalization_grouped_reporting_disposition_summary",
      resultCount: 5,
      invokedResultCount: 3,
      blockedResultCount: 2,
      groupCount: 2,
      reportingDisposition: "mixed",
      hasResults: true,
      allResultsInvoked: false,
      allResultsBlocked: false,
      hasMixedDisposition: true
    });
  });

  it("should fail loudly when the supplied disposition basis drifts from the current layer", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationClosureSummary({
        ...createDispositionSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          groupCount: 0,
          reportingDisposition: "empty"
        }),
        groupedReportingDispositionBasis:
          "handoff_finalization_grouped_projection_summary"
      } as never);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      'Attempt handoff finalization closure summary requires summary.groupedReportingDispositionBasis to be "handoff_finalization_grouped_reporting_summary".'
    );
  });

  it("should fail loudly when the count split stops adding up", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 3,
          invokedResultCount: 1,
          blockedResultCount: 1,
          groupCount: 1,
          reportingDisposition: "mixed"
        })
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closure summary requires summary.invokedResultCount plus summary.blockedResultCount to equal summary.resultCount."
    );
  });

  it("should fail loudly when the disposition drifts from the canonical count-derived disposition", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 2,
          invokedResultCount: 2,
          blockedResultCount: 0,
          groupCount: 1,
          reportingDisposition: "mixed"
        })
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closure summary requires summary.reportingDisposition to match the canonical disposition derived from the result counts."
    );
  });

  it("should fail loudly when groupCount drifts from the canonical disposition-derived group count", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationClosureSummary(
        createDispositionSummary({
          resultCount: 3,
          invokedResultCount: 3,
          blockedResultCount: 0,
          groupCount: 99,
          reportingDisposition: "all_invoked"
        })
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization closure summary requires summary.groupCount to match the canonical group count derived from summary.reportingDisposition."
    );
  });

  it("should keep the closure summary shape minimal and free of reporting internals", () => {
    const result = deriveAttemptHandoffFinalizationClosureSummary(
      createDispositionSummary({
        resultCount: 2,
        invokedResultCount: 0,
        blockedResultCount: 2,
        groupCount: 1,
        reportingDisposition: "all_blocked"
      })
    );

    expect(result).toBeDefined();
    expect(Object.keys(result ?? {}).sort()).toEqual(
      [
        "allResultsBlocked",
        "allResultsInvoked",
        "blockedResultCount",
        "closureBasis",
        "groupCount",
        "hasMixedDisposition",
        "hasResults",
        "invokedResultCount",
        "reportingDisposition",
        "resultCount"
      ].sort()
    );
  });
});

function createDispositionSummary(
  input: Omit<
    AttemptHandoffFinalizationGroupedReportingDispositionSummary,
    "groupedReportingDispositionBasis"
  >
): AttemptHandoffFinalizationGroupedReportingDispositionSummary {
  return {
    groupedReportingDispositionBasis:
      "handoff_finalization_grouped_reporting_summary",
    ...input
  };
}
