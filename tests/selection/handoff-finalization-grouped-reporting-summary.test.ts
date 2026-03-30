import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationGroupedProjectionGroup,
  AttemptHandoffFinalizationGroupedProjectionSummary,
  AttemptHandoffFinalizationReportReadyEntry
} from "../../src/selection/types.js";

type GroupedReportingGroupShape = {
  groupKey: AttemptHandoffFinalizationExplanationCode;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
};

const deriveAttemptHandoffFinalizationGroupedReportingSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationGroupedReportingSummary: (
      input: AttemptHandoffFinalizationGroupedProjectionSummary | undefined
    ) =>
      | {
          groupedReportingBasis: string;
          resultCount: number;
          invokedResultCount: number;
          blockedResultCount: number;
          groups: GroupedReportingGroupShape[];
        }
      | undefined;
  }>
).deriveAttemptHandoffFinalizationGroupedReportingSummary as (
  input: AttemptHandoffFinalizationGroupedProjectionSummary | undefined
) =>
  | {
      groupedReportingBasis: string;
      resultCount: number;
      invokedResultCount: number;
      blockedResultCount: number;
      groups: GroupedReportingGroupShape[];
    }
  | undefined;

describe("selection handoff-finalization-grouped-reporting-summary helpers", () => {
  it("should return undefined when the supplied grouped projection summary is undefined", () => {
    expect(
      deriveAttemptHandoffFinalizationGroupedReportingSummary(undefined)
    ).toBeUndefined();
  });

  it("should derive a zero-count grouped reporting summary for an empty grouped projection summary", () => {
    expect(
      deriveAttemptHandoffFinalizationGroupedReportingSummary({
        groupedProjectionBasis: "handoff_finalization_report_ready",
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        groups: []
      })
    ).toEqual({
      groupedReportingBasis:
        "handoff_finalization_grouped_projection_summary",
      resultCount: 0,
      invokedResultCount: 0,
      blockedResultCount: 0,
      groups: []
    });
  });

  it("should derive a count-only grouped reporting digest while preserving group order", () => {
    expect(
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            resultCount: 2,
            blockedResultCount: 2,
            results: [
              createBlockedReportReadyEntry({
                attemptId: "att_blocked_1",
                runtime: "blocked-cli"
              }),
              createBlockedReportReadyEntry({
                attemptId: "att_blocked_2",
                runtime: "blocked-cli",
                sourceKind: "delegated"
              })
            ]
          }),
          createInvokedProjectionGroup({
            results: [
              createInvokedReportReadyEntry({
                attemptId: "att_invoked_1",
                runtime: "codex-cli"
              })
            ]
          })
        ])
      )
    ).toEqual({
      groupedReportingBasis:
        "handoff_finalization_grouped_projection_summary",
      resultCount: 3,
      invokedResultCount: 1,
      blockedResultCount: 2,
      groups: [
        {
          groupKey: "handoff_finalization_blocked_unsupported",
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2
        },
        {
          groupKey: "handoff_finalization_invoked",
          resultCount: 1,
          invokedResultCount: 1,
          blockedResultCount: 0
        }
      ]
    });
  });

  it("should fail loudly when the supplied grouped projection basis drifts from the current layer", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary({
        ...createGroupedProjectionSummary([]),
        groupedProjectionBasis: "handoff_finalization_explanation_summary"
      } as never);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      'Attempt handoff finalization grouped reporting summary requires summary.groupedProjectionBasis to be "handoff_finalization_report_ready".'
    );
  });

  it("should fail loudly when grouped projection groups are not an array", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary({
        groupedProjectionBasis: "handoff_finalization_report_ready",
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        groups: null
      } as never);

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary.groups to be an array."
    );
  });

  it("should fail loudly when grouped projection groups rely on inherited array indexes", () => {
    Array.prototype[0] = createBlockedProjectionGroup();

    try {
      const sparseGroups =
        new Array<AttemptHandoffFinalizationGroupedProjectionGroup>(1);
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingSummary({
          groupedProjectionBasis: "handoff_finalization_report_ready",
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          groups: sparseGroups
        });

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting summary requires summary.groups entries to be objects."
      );
    } finally {
      delete Array.prototype[0];
    }
  });

  it("should fail loudly when a grouped projection group count drifts from the canonical result length", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            resultCount: 2,
            blockedResultCount: 1,
            results: [createBlockedReportReadyEntry()]
          })
        ])
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires each group resultCount to match group.results.length."
    );
  });

  it("should fail loudly when group results rely on inherited array indexes", () => {
    Array.prototype[0] = createBlockedReportReadyEntry();

    try {
      const sparseResults =
        new Array<AttemptHandoffFinalizationReportReadyEntry>(1);
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingSummary(
          createGroupedProjectionSummary([
            createBlockedProjectionGroup({
              resultCount: 1,
              blockedResultCount: 1,
              results: sparseResults
            })
          ])
        );

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
      );
    } finally {
      delete Array.prototype[0];
    }
  });

  it("should fail loudly when a group key drifts from the grouped entry explanation code", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            groupKey: "handoff_finalization_invoked",
            results: [createBlockedReportReadyEntry()]
          })
        ])
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires each group result entry to match the groupKey explanation code."
    );
  });

  it("should fail loudly when grouped projection input contains duplicate explanation-code groups", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            results: [createBlockedReportReadyEntry({ attemptId: "att_blocked_1" })]
          }),
          createBlockedProjectionGroup({
            results: [createBlockedReportReadyEntry({ attemptId: "att_blocked_2" })]
          })
        ])
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary.groups to keep a single canonical group per explanation code."
    );
  });

  it("should fail loudly when top-level grouped projection counts drift from the canonical group sums", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary({
        ...createGroupedProjectionSummary([createInvokedProjectionGroup()]),
        resultCount: 2
      });

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary.resultCount to match the canonical total derived from summary.groups."
    );
  });

  it("should keep the grouped reporting summary shape minimal without leaking grouped entries", () => {
    const summary = deriveAttemptHandoffFinalizationGroupedReportingSummary(
      createGroupedProjectionSummary([createInvokedProjectionGroup()])
    ) as Record<string, unknown>;

    expect(Object.keys(summary).sort()).toEqual(
      [
        "blockedResultCount",
        "groupedReportingBasis",
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
        "resultCount"
      ].sort()
    );
  });
});

function createGroupedProjectionSummary(
  groups: GroupedProjectionGroupInput[]
): AttemptHandoffFinalizationGroupedProjectionSummary {
  const resultCount = groups.reduce((sum, group) => sum + group.resultCount, 0);
  const invokedResultCount = groups.reduce(
    (sum, group) => sum + group.invokedResultCount,
    0
  );
  const blockedResultCount = groups.reduce(
    (sum, group) => sum + group.blockedResultCount,
    0
  );

  return {
    groupedProjectionBasis: "handoff_finalization_report_ready",
    resultCount,
    invokedResultCount,
    blockedResultCount,
    groups
  };
}

type GroupedProjectionGroupInput = {
  groupKey: AttemptHandoffFinalizationExplanationCode;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  results: AttemptHandoffFinalizationReportReadyEntry[];
};

function createInvokedProjectionGroup(
  overrides: Partial<GroupedProjectionGroupInput> = {}
): GroupedProjectionGroupInput {
  const results = overrides.results ?? [createInvokedReportReadyEntry()];

  return {
    groupKey: "handoff_finalization_invoked",
    resultCount: results.length,
    invokedResultCount: results.filter((entry) => entry.invoked).length,
    blockedResultCount: results.filter((entry) => !entry.invoked).length,
    results,
    ...overrides
  };
}

function createBlockedProjectionGroup(
  overrides: Partial<GroupedProjectionGroupInput> = {}
): GroupedProjectionGroupInput {
  const results = overrides.results ?? [createBlockedReportReadyEntry()];

  return {
    groupKey: "handoff_finalization_blocked_unsupported",
    resultCount: results.length,
    invokedResultCount: results.filter((entry) => entry.invoked).length,
    blockedResultCount: results.filter((entry) => !entry.invoked).length,
    results,
    ...overrides
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
    blockingReasons: [
      "handoff_finalization_unsupported"
    ] satisfies AttemptHandoffFinalizationConsumerBlockingReason[],
    ...overrides
  };
}
