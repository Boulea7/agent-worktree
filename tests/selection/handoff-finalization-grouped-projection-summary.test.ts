import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationReportReady,
  AttemptHandoffFinalizationReportReadyEntry
} from "../../src/selection/types.js";

type GroupedProjectionEntryShape = {
  taskId: string;
  attemptId: string;
  runtime: string;
  status: string;
  sourceKind: string | undefined;
  explanationCode: AttemptHandoffFinalizationExplanationCode;
  invoked: boolean;
  blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
};

type GroupedProjectionGroupShape = {
  groupKey: AttemptHandoffFinalizationExplanationCode;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  results: GroupedProjectionEntryShape[];
};

const deriveAttemptHandoffFinalizationGroupedProjectionSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationGroupedProjectionSummary: (
      input: AttemptHandoffFinalizationReportReady | undefined
    ) =>
      | {
          groupedProjectionBasis: string;
          resultCount: number;
          invokedResultCount: number;
          blockedResultCount: number;
          groups: GroupedProjectionGroupShape[];
        }
      | undefined;
  }>
).deriveAttemptHandoffFinalizationGroupedProjectionSummary as (
  input: AttemptHandoffFinalizationReportReady | undefined
) =>
  | {
      groupedProjectionBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      groups: GroupedProjectionGroupShape[];
    }
  | undefined;

describe("selection handoff-finalization-grouped-projection-summary helpers", () => {
  it("should return undefined when the supplied report-ready projection is undefined", () => {
    expect(
      deriveAttemptHandoffFinalizationGroupedProjectionSummary(undefined)
    ).toBeUndefined();
  });

  it("should derive a zero-count grouped projection summary for an empty report-ready projection", () => {
    expect(
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        reportBasis: "handoff_finalization_explanation_summary",
        results: [],
        invokedResults: [],
        blockedResults: []
      })
    ).toEqual({
      groupedProjectionBasis: "handoff_finalization_report_ready",
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      groups: []
    });
  });

  it("should derive stable grouped counts from a mixed report-ready projection", () => {
    expect(
      deriveAttemptHandoffFinalizationGroupedProjectionSummary(
        createReportReadySummary([
          createBlockedReportReadyEntry({
            taskId: " task_shared ",
            attemptId: " att_blocked_1 ",
            runtime: " blocked-cli ",
            sourceKind: "delegated"
          }),
          createInvokedReportReadyEntry({
            taskId: " task_shared ",
            attemptId: " att_invoked_1 ",
            runtime: " codex-cli "
          }),
          createBlockedReportReadyEntry({
            taskId: " task_shared ",
            attemptId: " att_blocked_2 ",
            runtime: " blocked-cli ",
            sourceKind: undefined
          })
        ])
      )
    ).toEqual({
      groupedProjectionBasis: "handoff_finalization_report_ready",
      resultCount: 3,
      invokedResultCount: 1,
      blockedResultCount: 2,
      groups: [
        {
          groupKey: "handoff_finalization_blocked_unsupported",
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2,
          results: [
            createBlockedReportReadyEntry({
              taskId: "task_shared",
              attemptId: "att_blocked_1",
              runtime: "blocked-cli",
              sourceKind: "delegated"
            }),
            createBlockedReportReadyEntry({
              taskId: "task_shared",
              attemptId: "att_blocked_2",
              runtime: "blocked-cli",
              sourceKind: undefined
            })
          ]
        },
        {
          groupKey: "handoff_finalization_invoked",
          resultCount: 1,
          invokedResultCount: 1,
          blockedResultCount: 0,
          results: [
            createInvokedReportReadyEntry({
              taskId: "task_shared",
              attemptId: "att_invoked_1",
              runtime: "codex-cli"
            })
          ]
        }
      ]
    });
  });

  it("should fail loudly when the supplied report basis drifts from the report-ready layer", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([]),
        reportBasis: "handoff_finalization_outcome_summary"
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([]),
        reportBasis: "handoff_finalization_outcome_summary"
      } as never)
    ).toThrow(
      'Attempt handoff finalization grouped projection summary requires summary.reportBasis to be "handoff_finalization_explanation_summary".'
    );
  });

  it("should fail loudly when the supplied report-ready results are not an array", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        reportBasis: "handoff_finalization_explanation_summary",
        results: null,
        invokedResults: [],
        blockedResults: []
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        reportBasis: "handoff_finalization_explanation_summary",
        results: null,
        invokedResults: [],
        blockedResults: []
      } as never)
    ).toThrow(
      "Attempt handoff finalization grouped projection summary requires summary.results to be an array."
    );
  });

  it("should fail loudly when report-ready results contain sparse slots", () => {
    const sparseResults = new Array<AttemptHandoffFinalizationReportReadyEntry>(1);
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        reportBasis: "handoff_finalization_explanation_summary",
        results: sparseResults,
        invokedResults: [],
        blockedResults: []
      });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped projection summary requires summary.results entries to be objects."
    );
  });

  it("should fail loudly when report-ready results rely on inherited array indexes", () => {
    Array.prototype[0] = createBlockedReportReadyEntry();

    try {
      const sparseResults =
        new Array<AttemptHandoffFinalizationReportReadyEntry>(1);
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedProjectionSummary({
          reportBasis: "handoff_finalization_explanation_summary",
          results: sparseResults,
          invokedResults: [],
          blockedResults: []
        });

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped projection summary requires summary.results entries to be objects."
      );
    } finally {
      delete Array.prototype[0];
    }
  });

  it("should fail loudly when report-ready subgroups drift from the canonical filtered groups", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([createBlockedReportReadyEntry()]),
        blockedResults: []
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([createBlockedReportReadyEntry()]),
        blockedResults: []
      })
    ).toThrow(
      "Attempt handoff finalization grouped projection summary requires summary.blockedResults to match the stable filtered blocked subgroup."
    );
  });

  it("should fail loudly when invoked subgroup arrays contain invalid entries", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([createInvokedReportReadyEntry()]),
        invokedResults: [null as never]
      });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped projection summary requires summary.invokedResults to match the stable filtered invoked subgroup."
    );
  });

  it("should fail loudly when blocked subgroup arrays contain sparse slots", () => {
    const sparseBlockedResults =
      new Array<AttemptHandoffFinalizationReportReadyEntry>(1);
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([createBlockedReportReadyEntry()]),
        blockedResults: sparseBlockedResults
      });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped projection summary requires summary.blockedResults to match the stable filtered blocked subgroup."
    );
  });

  it("should fail loudly when blocked subgroup arrays contain invalid entries", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary({
        ...createReportReadySummary([createBlockedReportReadyEntry()]),
        blockedResults: [null as never]
      });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped projection summary requires summary.blockedResults to match the stable filtered blocked subgroup."
    );
  });

  it("should fail loudly when report-ready entries violate the current explanation/blocker contract", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary(
        createReportReadySummary([
          createBlockedReportReadyEntry({
            explanationCode: "handoff_finalization_invoked",
            blockingReasons: ["handoff_finalization_unsupported"]
          })
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedProjectionSummary(
        createReportReadySummary([
          createBlockedReportReadyEntry({
            explanationCode: "handoff_finalization_invoked",
            blockingReasons: ["handoff_finalization_unsupported"]
          })
        ])
      )
    ).toThrow(
      'Attempt handoff finalization grouped projection summary requires blocked entries to use "handoff_finalization_blocked_unsupported".'
    );
  });

  it("should keep the grouped projection summary shape minimal without leaking subgroup mirrors", () => {
    const summary = deriveAttemptHandoffFinalizationGroupedProjectionSummary(
      createReportReadySummary([createInvokedReportReadyEntry()])
    ) as Record<string, unknown>;

    expect(Object.keys(summary).sort()).toEqual(
      [
        "blockedResultCount",
        "groupedProjectionBasis",
        "groups",
        "invokedResultCount",
        "resultCount"
      ].sort()
    );
    expect(
      Object.keys((summary.groups as Array<Record<string, unknown>>)[0]!).sort()
    ).toEqual(
      [
        "blockedResultCount",
        "groupKey",
        "invokedResultCount",
        "resultCount",
        "results"
      ].sort()
    );
    expect(
      Object.keys(
        (
          (summary.groups as Array<Record<string, unknown>>)[0]!.results as Array<
            Record<string, unknown>
          >
        )[0]!
      ).sort()
    ).toEqual(
      [
        "attemptId",
        "blockingReasons",
        "explanationCode",
        "invoked",
        "runtime",
        "sourceKind",
        "status",
        "taskId"
      ].sort()
    );
  });
});

function createReportReadySummary(
  results: AttemptHandoffFinalizationReportReadyEntry[]
): AttemptHandoffFinalizationReportReady {
  return {
    reportBasis: "handoff_finalization_explanation_summary",
    results,
    invokedResults: results.filter((entry) => entry.invoked),
    blockedResults: results.filter((entry) => !entry.invoked)
  };
}

function createInvokedReportReadyEntry(
  overrides: Partial<AttemptHandoffFinalizationReportReadyEntry> = {}
): AttemptHandoffFinalizationReportReadyEntry {
  return {
    taskId: "task_shared",
    attemptId: "att_invoked",
    runtime: "codex-cli",
    status: "running",
    sourceKind: undefined,
    explanationCode: "handoff_finalization_invoked",
    invoked: true,
    blockingReasons: [],
    ...overrides
  };
}

function createBlockedReportReadyEntry(
  overrides: Partial<AttemptHandoffFinalizationReportReadyEntry> = {}
): AttemptHandoffFinalizationReportReadyEntry {
  return {
    taskId: "task_shared",
    attemptId: "att_blocked",
    runtime: "blocked-cli",
    status: "created",
    sourceKind: undefined,
    explanationCode: "handoff_finalization_blocked_unsupported",
    invoked: false,
    blockingReasons: ["handoff_finalization_unsupported"],
    ...overrides
  };
}
