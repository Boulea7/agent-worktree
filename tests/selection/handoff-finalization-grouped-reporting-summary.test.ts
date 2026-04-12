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

  it("should fail loudly when the supplied grouped projection summary is null", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(null as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(null as never)
    ).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary to be an object."
    );
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

  it("should fail closed when reading groupKey throws through an accessor-shaped input", () => {
    const group = createBlockedProjectionGroup();
    Object.defineProperty(group, "groupKey", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });

    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([group as never])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([group as never])
      )
    ).toThrow(
      "Attempt handoff finalization grouped reporting summary requires each groupKey to use the existing handoff-finalization explanation vocabulary."
    );
  });

  it("should fail closed when a grouped projection groups array entry throws through an accessor-shaped index", () => {
    const groups = [createBlockedProjectionGroup()];
    Object.defineProperty(groups, "0", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });

    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary({
        groupedProjectionBasis: "handoff_finalization_report_ready",
        resultCount: 1,
        invokedResultCount: 0,
        blockedResultCount: 1,
        groups: groups as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary({
        groupedProjectionBasis: "handoff_finalization_report_ready",
        resultCount: 1,
        invokedResultCount: 0,
        blockedResultCount: 1,
        groups: groups as never
      })
    ).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary.groups entries to be objects."
    );
  });

  it("should fail closed when a group results array entry throws through an accessor-shaped index", () => {
    const results = [createBlockedReportReadyEntry()];
    Object.defineProperty(results, "0", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });
    const group = createBlockedProjectionGroup();
    group.results = results as never;
    group.resultCount = 1;
    group.invokedResultCount = 0;
    group.blockedResultCount = 1;

    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([group])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([group])
      )
    ).toThrow(
      "Attempt handoff finalization grouped reporting summary requires group.results entries to be objects."
    );
  });

  it("should still accept own grouped projection entries that shadow inherited array indexes", () => {
    Array.prototype[0] = createBlockedProjectionGroup({
      results: [createBlockedReportReadyEntry({ attemptId: "att_inherited" })]
    });

    try {
      const summary = deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createInvokedProjectionGroup({
            results: [createInvokedReportReadyEntry({ attemptId: "att_own" })]
          })
        ])
      );

      expect(summary).toEqual({
        groupedReportingBasis: "handoff_finalization_grouped_projection_summary",
        resultCount: 1,
        invokedResultCount: 1,
        blockedResultCount: 0,
        groups: [
          {
            groupKey: "handoff_finalization_invoked",
            resultCount: 1,
            invokedResultCount: 1,
            blockedResultCount: 0
          }
        ]
      });
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

  it("should fail loudly when grouped projection results mix taskIds across groups after canonicalization", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            results: [
              createBlockedReportReadyEntry({
                taskId: "task_shared",
                attemptId: "att_blocked"
              })
            ]
          }),
          createInvokedProjectionGroup({
            results: [
              createInvokedReportReadyEntry({
                taskId: " task_other ",
                attemptId: "att_invoked"
              })
            ]
          })
        ])
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary.groups results from a single taskId."
    );
  });

  it("should fail loudly when grouped projection results reuse duplicate identities across groups after canonicalization", () => {
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            results: [
              createBlockedReportReadyEntry({
                taskId: "task_shared",
                attemptId: "att_dup",
                runtime: "codex-cli"
              })
            ]
          }),
          createInvokedProjectionGroup({
            results: [
              createInvokedReportReadyEntry({
                taskId: " task_shared ",
                attemptId: " att_dup ",
                runtime: " codex-cli "
              })
            ]
          })
        ])
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires summary.groups results to use unique (taskId, attemptId, runtime) identities."
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

  it("should fail loudly when grouped entries contain sparse blockingReasons arrays", () => {
    const sparseBlockingReasons =
      new Array<AttemptHandoffFinalizationConsumerBlockingReason>(1);
    const act = () =>
      deriveAttemptHandoffFinalizationGroupedReportingSummary(
        createGroupedProjectionSummary([
          createBlockedProjectionGroup({
            results: [
              createBlockedReportReadyEntry({
                blockingReasons: sparseBlockingReasons
              })
            ]
          })
        ])
      );

    expect(act).toThrow(ValidationError);
    expect(act).toThrow(
      "Attempt handoff finalization grouped reporting summary requires entry.blockingReasons to use the existing handoff-finalization blocker vocabulary."
    );
  });

  it("should fail loudly when grouped entries rely on inherited blockingReasons indexes", () => {
    Array.prototype[0] = "handoff_finalization_unsupported";

    try {
      const inheritedBlockingReasons =
        new Array<AttemptHandoffFinalizationConsumerBlockingReason>(1);
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingSummary(
          createGroupedProjectionSummary([
            createBlockedProjectionGroup({
              results: [
                createBlockedReportReadyEntry({
                  blockingReasons: inheritedBlockingReasons
                })
              ]
            })
          ])
        );

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting summary requires entry.blockingReasons to use the existing handoff-finalization blocker vocabulary."
      );
    } finally {
      delete Array.prototype[0];
    }
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
